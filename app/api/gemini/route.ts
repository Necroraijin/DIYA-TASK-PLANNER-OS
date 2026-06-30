import { NextResponse } from 'next/server';
import { getGemini, generateWithFallback } from '@/lib/gemini';
import { Type } from '@google/genai';

export async function POST(req: Request) {
  let title = "";
  let category = "";
  let priority = "";
  let deadline = "";
  let description = "";

  try {
    const body = await req.json();
    title = body.title || "";
    category = body.category || "";
    priority = body.priority || "";
    deadline = body.deadline || "";
    description = body.description || "";

    if (!title) {
      return NextResponse.json({ error: 'Task title is required' }, { status: 400 });
    }

    const ai = getGemini();

    const response = await generateWithFallback(ai, {
      model: 'gemini-3.5-flash',
      contents: `Perform a student-centric cognitive priority audit on the following task:
Title: "${title}"
Category: "${category || 'General'}"
Priority: "${priority || 'Medium'}"
Deadline: "${deadline}"
Description: "${description || 'None provided'}"`,
      config: {
        systemInstruction: "You are Diya's Student Co-pilot, a warm and intelligent academic companion. Your purpose is to assess tasks for cognitive load, evaluate the actual cost of delay, and provide 3 simple ready-to-go starter templates or alternative paths to overcome procrastination.",
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            cognitivePriority: { 
              type: Type.STRING, 
              description: "A short, empathetic explanation of why this task might be triggering mental friction or procrastination, and how to frame it positively." 
            },
            consequencesOfMissing: { 
              type: Type.STRING, 
              description: "A clear, realistic, and stress-minimized explanation of what actually happens if they miss the deadline." 
            },
            readyToGoSolutions: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING }, 
              description: "Exactly three direct, actionable starter templates or first-step actions to instantly bypass procrastination (e.g., 'Open Google Doc and write exactly 1 sentence', 'Read first 2 pages of chapter 4')." 
            },
            alternativePlans: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING }, 
              description: "Two backup strategies or safety nets if the student runs out of time or gets stuck." 
            },
            copilotAssistance: { 
              type: Type.STRING, 
              description: "An encouraging, supportive, and motivating sentence to make the student feel capable and stress-free." 
            }
          },
          required: ["cognitivePriority", "consequencesOfMissing", "readyToGoSolutions", "alternativePlans", "copilotAssistance"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response received from the Gemini Model");
    }

    const auditResult = JSON.parse(text.trim());
    return NextResponse.json({
      ...auditResult,
      modelUsed: (response as any).modelUsed
    });

  } catch (error: any) {
    console.warn("Gemini API error, triggering high-fidelity sandbox fallback:", error);
    
    const titleLower = (title || '').toLowerCase();
    let cognitivePriority = `Starting "${title}" can feel challenging because it requires shifting your focus and energy. Breaking this down into micro-steps will lower the mental friction.`;
    let consequencesOfMissing = "A slight delay might mean rushing later, but it won't be a disaster. Let's aim to get a quick win now to keep you ahead and stress-free!";
    let readyToGoSolutions = [
      "Open your workspace and write down exactly one sentence of progress.",
      "Set a timer for 10 minutes and do as much easy work as you can.",
      "Review the basic requirements for 3 minutes without pressure to write anything."
    ];
    let alternativePlans = [
      "Focus on outline sketching today and write the actual content tomorrow.",
      "Reach out to a study partner or tutor for a quick 5-minute question check."
    ];
    let copilotAssistance = "You have got this! Let's handle the first simple step together. Small progress is still progress!";

    if (titleLower.includes('biology') || titleLower.includes('chloroplast') || titleLower.includes('science')) {
      cognitivePriority = "Dense science terms and detailed diagrams require precise visual memory, which can make starting feel like a high cognitive load.";
      consequencesOfMissing = "Missing the target could result in a rush to understand complex organelle interactions right before the review. Getting started early ensures deep conceptual learning.";
      readyToGoSolutions = [
        "Open your biology textbook or slide deck and read slide 4/chapter diagram for 5 minutes.",
        "Sketch a rough hand-drawn chloroplast outline with labeled outer and inner membranes.",
        "Draft a 2-bullet summary of ATP synthesis in the stroma vs. thylakoid."
      ];
      alternativePlans = [
        "Watch a 5-minute YouTube or Khan Academy video explaining chloroplast structures.",
        "Use active recall flashcards for the main biology definitions instead of writing essays."
      ];
      copilotAssistance = "You are fully capable of mastering this biology material. Let's tackle it step-by-step!";
    } else if (titleLower.includes('essay') || titleLower.includes('write') || titleLower.includes('outline')) {
      cognitivePriority = "The fear of the 'blank page' is the number one cause of writing block. Shifting focus to an outline will make starting seamless.";
      consequencesOfMissing = "Delaying might reduce the time available for proofreading. Creating a simple outline today gives your ideas time to mature.";
      readyToGoSolutions = [
        "Write exactly one simple, unedited thesis sentence describing your main argument.",
        "List three high-level headers or bullet points you want to cover.",
        "Spend 5 minutes listing all relevant sources or data points you have gathered so far."
      ];
      alternativePlans = [
        "Dictate your thoughts into a voice recorder for 2 minutes, then copy the transcript.",
        "Start with a raw, imperfect draft and refine the phrasing in a second pass tomorrow."
      ];
      copilotAssistance = "Writing is a process of refinement, not perfection. Start small and watch your ideas unfold!";
    }

    return NextResponse.json({
      cognitivePriority,
      consequencesOfMissing,
      readyToGoSolutions,
      alternativePlans,
      copilotAssistance,
      isFallback: true
    });
  }
}
