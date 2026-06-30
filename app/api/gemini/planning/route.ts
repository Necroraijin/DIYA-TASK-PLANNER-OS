import { NextResponse } from 'next/server';
import { getGemini, generateWithFallback } from '@/lib/gemini';
import { Type } from '@google/genai';

export async function POST(req: Request) {
  let messages: any[] = [];
  let documentText = "";
  let currentTasks: any[] = [];

  try {
    const body = await req.json();
    messages = body.messages || [];
    documentText = body.documentText || "";
    currentTasks = body.currentTasks || [];

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 });
    }

    const ai = getGemini();

    // Compile message history
    let promptHistory = "You are Diya's AI Planner Companion. Help the student create structured bulleted study guides, homework outlines, or tactical plans.\n";
    
    if (documentText) {
      promptHistory += `The student has uploaded or copy-pasted a document. Here is its content to base the plan on:\n---\n${documentText}\n---\n\n`;
    }

    if (currentTasks && Array.isArray(currentTasks) && currentTasks.length > 0) {
      promptHistory += "Here are the student's current tasks already on the calendar:\n";
      currentTasks.forEach((t: any) => {
        promptHistory += `- [${t.category || 'Task'}] ${t.title} (Due: ${t.deadline || 'No Date'}, Priority: ${t.priority || 'Medium'}, Status: ${t.status || 'Pending'})\n`;
      });
      promptHistory += "\n";
    }

    promptHistory += "Below is the conversational chat history. Respond to the latest message, creating highly readable, bulleted plans, checklists, or steps. Also, if appropriate, extract and suggest specific milestone events or tasks (with exact dates, using the current year 2026 if no year is clear) that can be marked on the user's calendar.\n\n";

    messages.forEach((m: any) => {
      const sender = m.role === 'user' ? 'Student' : 'AI Companion';
      promptHistory += `${sender}: ${m.content}\n`;
    });

    promptHistory += "\nAI Companion:";

    const response = await generateWithFallback(ai, {
      model: 'gemini-3.5-flash',
      contents: promptHistory,
      config: {
        systemInstruction: "You are Diya's Master AI Study Coach. Your core purpose is to guide students to perform academic tasks and studying with maximum efficiency. You must write your responses almost entirely using bulleted points (using markdown lists) to break down complex concepts, outline clear plans, and guide the student on how to execute step-by-step. Keep your tone encouraging, tactical, and expert.",
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            replyText: {
              type: Type.STRING,
              description: "The main conversational response in beautiful Markdown, including detailed bulleted outlines, study guides, or step-by-step guidelines."
            },
            suggestedCalendarItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "Clear, action-oriented milestone or task name" },
                  deadline: { type: Type.STRING, description: "Estimated or suggested completion date in YYYY-MM-DD format (e.g., 2026-07-05)" },
                  priority: { type: Type.STRING, description: "Priority level: High, Medium, or Low" },
                  category: { type: Type.STRING, description: "Category/tag name (e.g. Study Plan, Prep, Milestone, Task)" },
                  description: { type: Type.STRING, description: "Brief details or checklist for this sub-task" }
                },
                required: ["title", "deadline", "priority", "category", "description"]
              },
              description: "Specific action steps/tasks derived from the conversation to be marked on the calendar. Only suggest items that make logical sense to schedule."
            }
          },
          required: ["replyText", "suggestedCalendarItems"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response received from the AI model.");
    }

    const parsedResult = JSON.parse(text.trim());
    return NextResponse.json({
      ...parsedResult,
      modelUsed: (response as any).modelUsed
    });

  } catch (error: any) {
    console.warn("Gemini Planning API error, triggering high-fidelity sandbox fallback:", error);
    
    // Find last user message
    let lastUserMessage = "Study Plan";
    if (messages && messages.length > 0) {
      const userMsgs = messages.filter((m: any) => m.role === 'user');
      if (userMsgs.length > 0) {
        lastUserMessage = userMsgs[userMsgs.length - 1].content;
      }
    }

    const docNameText = documentText ? "uploaded document" : "";
    
    let replyText = `### 📋 Diya AI Study Session Guide (Sandbox Mode)
    
I have analyzed your request: **"${lastUserMessage}"** ${docNameText ? `and your ${docNameText}` : ''}. 

Here is a comprehensive, structured study guide and actionable steps to help you succeed with maximum efficiency:

- **Break Down the Concepts**:
  - Review core terms, diagrams, or requirements to build a solid baseline of understanding.
  - Dedicate 15-20 minutes to scan syllabus landmarks or guidelines so you can structure your outputs.
- **Micro-Sprints**:
  - Schedule 25-minute Pomodoro sessions to focus completely on writing or exercises with zero notifications.
  - Break down your project into three micro-deadlines rather than tackling it all at once.
- **Active Review & Recall**:
  - Test your memory using sample problems, mock prompt outlines, or active recall questions.
  - Share key doubts with study partners or prepare draft questions for office hours.`;

    const titleLower = lastUserMessage.toLowerCase();
    if (titleLower.includes('biology') || titleLower.includes('chloroplast') || titleLower.includes('science')) {
      replyText = `### 🧬 Biology Study & Diagram Guide (Sandbox Mode)

I have analyzed your science request: **"${lastUserMessage}"** to prepare an optimal plan focusing on chloroplast organelles:

- **Understand Chloroplast Membranes**:
  - Study the double-membrane envelope (outer and inner membranes) separating the stroma from the cytoplasm.
  - Differentiate between the light-dependent reactions in the thylakoid membranes (ATP and NADPH synthesis) and the light-independent reactions (Calvin Cycle) in the stroma.
- **Master the Photosynthesis Steps**:
  - Focus on chlorophyll light absorption, water photolysis, and proton gradient generation.
  - Visualize key stromal proteins and Rubisco's role in carbon fixation.
- **Review and Self-Test**:
  - Sketch a chloroplast diagram completely from memory, labeling the grana, stroma, thylakoids, and envelope.
  - Re-read key textbook diagrams to verify accuracy.`;
    } else if (titleLower.includes('essay') || titleLower.includes('write') || titleLower.includes('outline')) {
      replyText = `### 📝 Essay Outlining & Writing Strategy (Sandbox Mode)

I have analyzed your writing request: **"${lastUserMessage}"** to build a structured essay guide:

- **Draft a Strong Thesis**:
  - Your thesis should be a clear, one-sentence argument that answers the prompt directly.
  - Place your thesis statement at the end of your introduction to guide the reader.
- **Structure Your Supporting Arguments**:
  - Create three clear sections defending your primary thesis.
  - For each section, outline one key piece of evidence or citation from reliable sources.
- **Review and Refine**:
  - Write a rough, unedited initial draft first—focus on flow and ideas rather than grammar.
  - Proofread in a separate session tomorrow to polish the phrasing and check citations.`;
    }

    // Build some high-quality suggested calendar items
    const today = new Date();
    const formatOffsetDate = (days: number) => {
      const d = new Date();
      d.setDate(today.getDate() + days);
      return d.toISOString().split('T')[0];
    };

    let suggestedCalendarItems = [
      {
        title: `Scan & Prepare: ${lastUserMessage.substring(0, 30) || "Study Materials"}`,
        deadline: formatOffsetDate(1),
        priority: "High",
        category: "Study Plan",
        description: "Review basic requirements, gather textbooks/guidelines, and write a 3-sentence summary of goals."
      },
      {
        title: `Deep Session: ${lastUserMessage.substring(0, 30) || "Practice Session"}`,
        deadline: formatOffsetDate(3),
        priority: "Medium",
        category: "Study Plan",
        description: "Engage in 45 minutes of active learning, draft outline segments, or complete practice sets."
      },
      {
        title: `Final Polish: ${lastUserMessage.substring(0, 30) || "Review Exam Prep"}`,
        deadline: formatOffsetDate(5),
        priority: "High",
        category: "Study Plan",
        description: "Verify work against guidelines, refine formulas/details, and perform a timed self-evaluation."
      }
    ];

    if (titleLower.includes('biology') || titleLower.includes('chloroplast') || titleLower.includes('science')) {
      suggestedCalendarItems = [
        {
          title: "Study Chloroplast Structures",
          deadline: formatOffsetDate(1),
          priority: "High",
          category: "Study Plan",
          description: "Scan biology readings focusing on envelope membranes, grana, stroma, and thylakoid structures."
        },
        {
          title: "Draft Photosynthesis Summary",
          deadline: formatOffsetDate(2),
          priority: "Medium",
          category: "Prep",
          description: "Write down 3 concise steps of chloroplast carbon fixation and ATP synthesis."
        },
        {
          title: "Self-Test with Diagrams",
          deadline: formatOffsetDate(4),
          priority: "High",
          category: "Milestone",
          description: "Sketch and label the complete chloroplast organelle structure from memory and check accuracy."
        }
      ];
    } else if (titleLower.includes('essay') || titleLower.includes('write') || titleLower.includes('outline')) {
      suggestedCalendarItems = [
        {
          title: "Formulate Thesis Statement",
          deadline: formatOffsetDate(1),
          priority: "High",
          category: "Prep",
          description: "Write a one-sentence core thesis statement and draft three supporting outline bullet points."
        },
        {
          title: "Complete Essay First Draft",
          deadline: formatOffsetDate(3),
          priority: "Medium",
          category: "Study Plan",
          description: "Draft the introductory paragraph and support paragraphs without editing as you write."
        },
        {
          title: "Proofread and Reference Check",
          deadline: formatOffsetDate(5),
          priority: "High",
          category: "Milestone",
          description: "Review spelling, refine transitions, verify formatting, and check academic reference links."
        }
      ];
    }

    return NextResponse.json({
      replyText,
      suggestedCalendarItems,
      isFallback: true
    });
  }
}
