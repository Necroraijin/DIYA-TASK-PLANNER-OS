import { NextResponse } from 'next/server';
import { getGemini, generateWithFallback } from '@/lib/gemini';
import { Type } from '@google/genai';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, tasks, email } = body;

    const ai = getGemini();

    if (action === 'draft_reply') {
      if (!email) {
        return NextResponse.json({ error: 'Email data is required for drafting' }, { status: 400 });
      }

      try {
        const response = await generateWithFallback(ai, {
          model: 'gemini-3.5-flash',
          contents: `Draft a highly polished, proactive email response for the following incoming email:
Sender: "${email.sender} <${email.sender_email}>"
Subject: "${email.subject}"
Body: "${email.body}"

Provide:
1. A polite, warm, and structured email draft.
2. A list of 2-3 proactive actions the student should take immediately before sending (e.g., 'Draft a 3-sentence outline', 'Verify chloroplast diagram slide 4').`,
          config: {
            systemInstruction: "You are Diya's Proactive Email Assistant. Your goal is to draft elegant, professional, stress-minimized, and clear email responses that a student can send to their professors, partners, or coordinators. Maintain a highly supportive and capable academic tone. Keep the response compact and professional.",
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                draftText: {
                  type: Type.STRING,
                  description: "The complete, ready-to-copy email text starting with a salutation and ending with a signature placeholder (e.g. 'Best regards, [Your Name]')"
                },
                preparatorySteps: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Two or three highly specific checklist items the student should verify or do before sending this response."
                }
              },
              required: ["draftText", "preparatorySteps"]
            }
          }
        });

        const resultText = response.text;
        if (!resultText) throw new Error("No response from Gemini API");
        const parsed = JSON.parse(resultText.trim());
        return NextResponse.json({
          ...parsed,
          modelUsed: (response as any).modelUsed
        });
      } catch (geminiErr: any) {
        console.warn("Gmail draft Gemini error, running high-fidelity sandbox generator:", geminiErr);
        
        // Build customized fallback draft based on incoming email fields
        const senderFirstName = email.sender ? email.sender.split(' ')[0] : 'Professor';
        const subjectClean = email.subject ? email.subject.replace(/^(Re:\s*|re:\s*)+/i, '') : 'your request';
        
        let draftText = `Dear ${senderFirstName},\n\nThank you for reaching out regarding "${subjectClean}". I wanted to confirm that I am actively working on this and will follow up with the requested outline and deliverables before our deadline.\n\nPlease let me know if you have any additional questions or guidance in the meantime.\n\nBest regards,\nAlpha Trion`;
        let preparatorySteps = [
          "Complete the requested task outline or response bullet-points.",
          "Double check any diagram layout references before replying."
        ];

        const bodyLower = (email.body || '').toLowerCase();
        if (bodyLower.includes('biology') || bodyLower.includes('chloroplast') || bodyLower.includes('presentation') || bodyLower.includes('slides')) {
          draftText = `Hi ${senderFirstName},\n\nThanks for the message! I am reviewing our presentation slides and diagrams right now to ensure the chloroplast layout is correct. I will finalize and submit our deck well before the tomorrow noon deadline.\n\nLet me know if you spot anything else we should refine!\n\nBest regards,\nAlpha Trion`;
          preparatorySteps = [
            "Verify chloroplast diagram slide 4 layout references.",
            "Confirm that the slides upload works correctly before noon tomorrow."
          ];
        } else if (bodyLower.includes('essay') || bodyLower.includes('extension') || bodyLower.includes('outline')) {
          draftText = `Dear ${senderFirstName},\n\nThank you very much for granting me the extension until tomorrow. I greatly appreciate your flexibility. As requested, I have outlined my primary arguments below:\n\n[Insert 3-sentence outline here]\n\nI will continue writing the draft and submit the finalized essay on time tomorrow. Please let me know if this outline works for you!\n\nBest regards,\nAlpha Trion`;
          preparatorySteps = [
            "Write exactly 3 concise, high-quality outline sentences.",
            "Ensure arguments align with your biology thesis statement."
          ];
        }

        return NextResponse.json({
          draftText,
          preparatorySteps,
          isFallback: true
        });
      }
    }

    // Default action: generate proactive help and study guides for all tasks
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return NextResponse.json({ 
        guides: [],
        generalAdvice: "No active tasks are set. Add your goals and deadlines below so I can prepare study guides, personalized resources, and draft communications proactively!"
      });
    }

    const tasksString = tasks.map((t, idx) => `
Task #${idx + 1}:
Title: "${t.title}"
Category: "${t.category}"
Priority: "${t.priority}"
Deadline: "${t.deadline}"
Description: "${t.description || 'None provided'}"
`).join('\n');

    try {
      const response = await generateWithFallback(ai, {
        model: 'gemini-3.5-flash',
        contents: `Analyze the student's current tasks and proactively prepare personalized study guides, learning resources, and tactical instructions:
${tasksString}`,
        config: {
          systemInstruction: "You are Diya's Proactive Study Coach. Your job is to analyze the student's tasks and automatically create custom-tailored study outlines, recommended online research topics/resource links, and step-by-step instructions. Do not wait to be asked—provide highly practical, structured, and instantly helpful academic guidance to enable the student to begin immediately with no friction.",
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              generalAdvice: {
                type: Type.STRING,
                description: "A short, motivating, cohesive plan that ties together their active goals for the next 1-2 days."
              },
              guides: {
                type: Type.ARRAY,
                description: "Proactive guides generated for each task.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    taskTitle: { type: Type.STRING, description: "Title of the task these instructions belong to." },
                    stepByStepInstructions: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: "3-4 direct, granular steps the student can take right now to make rapid progress."
                    },
                    recommendedLinks: {
                      type: Type.ARRAY,
                      description: "2 curated learning terms, reference queries, or stable resource categories (e.g., 'Stanford Encyclopedia of Philosophy: Bioethics', 'Khan Academy: Photosynthesis & Chloroplasts').",
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          label: { type: Type.STRING, description: "Display name of the resource." },
                          searchQuery: { type: Type.STRING, description: "The highly specific educational Google Search or Wikipedia search topic (e.g., 'https://en.wikipedia.org/wiki/Chloroplast')." }
                        },
                        required: ["label", "searchQuery"]
                      }
                    },
                    readyToUseDraftPrompt: {
                      type: Type.STRING,
                      description: "An optional quick-draft template if they need to request guidance or help from their professor or peer."
                    }
                  },
                  required: ["taskTitle", "stepByStepInstructions", "recommendedLinks"]
                }
              }
            },
            required: ["generalAdvice", "guides"]
          }
        }
      });

      const text = response.text;
      if (!text) throw new Error("No response from Gemini API");

      const result = JSON.parse(text.trim());
      return NextResponse.json({
        ...result,
        modelUsed: (response as any).modelUsed
      });
    } catch (geminiErr: any) {
      console.warn("Proactive Task Gemini error, generating rich offline planner blueprint:", geminiErr);
      
      const generalAdvice = "I have compiled your customized study paths and active blueprints. Let's tackle these priorities systematically over the next 24-48 hours!";
      
      const guides = tasks.map(t => {
        let stepByStepInstructions = [
          `Break down the objectives for "${t.title}" into 3 simple 15-minute micro-tasks.`,
          "Open a dedicated document to draft the core thesis and structure your findings.",
          "Confirm project boundaries with your classmates or review against the syllabus guidelines."
        ];
        let recommendedLinks = [
          { label: `Wikipedia: ${t.title}`, searchQuery: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(t.title)}` },
          { label: `Google Scholar: ${t.title}`, searchQuery: `https://scholar.google.com/scholar?q=${encodeURIComponent(t.title)}` }
        ];

        const titleLower = t.title.toLowerCase();
        const descLower = (t.description || '').toLowerCase();
        if (titleLower.includes('biology') || titleLower.includes('botany') || titleLower.includes('plant') || descLower.includes('biology') || descLower.includes('chloroplast')) {
          stepByStepInstructions = [
            "Analyze chloroplast inner envelopes, stromal structures, and light harvesting systems.",
            "Detail the 3 key metabolic phases of photosynthetic carbon fixation.",
            "Draft a 3-sentence summary of chloroplast membrane dynamics to submit today."
          ];
          recommendedLinks = [
            { label: "Nature Education: Plant Biology Fundamentals", searchQuery: "https://www.nature.com/scitable/topic/plant-biology-14169724/" },
            { label: "Wikipedia: Chloroplast Organelles", searchQuery: "https://en.wikipedia.org/wiki/Chloroplast" }
          ];
        } else if (titleLower.includes('essay') || titleLower.includes('write') || titleLower.includes('outline') || descLower.includes('essay') || descLower.includes('write')) {
          stepByStepInstructions = [
            "Draft an introduction presenting a strong thesis statement mapping the essay arguments.",
            "Write down 3 concise outline headers defending the primary thesis statement.",
            "Search peer-reviewed literature for 2 corroborating academic journal references."
          ];
          recommendedLinks = [
            { label: "Purdue OWL: Interactive Outlining Guides", searchQuery: "https://owl.purdue.edu/owl/general_writing/the_writing_process/developing_an_outline/how_to_outline.html" },
            { label: "Google Scholar: Peer-Reviewed Biology Papers", searchQuery: "https://scholar.google.com/scholar?q=biology+membrane+transport" }
          ];
        }

        return {
          taskTitle: t.title,
          stepByStepInstructions,
          recommendedLinks,
          readyToUseDraftPrompt: `Hi, I am working on the ${t.title} project and wanted to ask if we could review the outline together briefly during office hours. Let me know if that works!`
        };
      });

      return NextResponse.json({
        generalAdvice,
        guides,
        isFallback: true
      });
    }

  } catch (err: any) {
    console.error("Proactive API Route Error:", err);
    return NextResponse.json({ error: err.message || "Failed to compile proactive guides" }, { status: 500 });
  }
}
