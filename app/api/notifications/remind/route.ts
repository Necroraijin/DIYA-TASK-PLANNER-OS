import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

interface Task {
  id: string;
  title: string;
  deadline?: string;
  status?: string;
  priority?: string;
  category?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { tasks, userEmail, username, smtpConfig } = await req.json();

    if (!tasks || !Array.isArray(tasks) || !userEmail) {
      return NextResponse.json({ error: 'Missing tasks or user email.' }, { status: 400 });
    }

    const now = new Date();
    // Normalize today to start of day
    const todayStr = now.toISOString().split('T')[0];
    const todayTime = new Date(todayStr).getTime();

    const notificationsSent: any[] = [];
    
    // Resolve SMTP settings from either passed config or environment variables
    const host = smtpConfig?.host || process.env.SMTP_HOST;
    const port = smtpConfig?.port ? parseInt(smtpConfig.port, 10) : (process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587);
    const user = smtpConfig?.user || process.env.SMTP_USER;
    const pass = smtpConfig?.pass || process.env.SMTP_PASS;
    const secure = smtpConfig?.secure !== undefined ? smtpConfig.secure : (process.env.SMTP_SECURE === 'true');

    let mailDispatchedCount = 0;
    let mailDispatchError: string | null = null;
    let transporter: any = null;

    if (host && user && pass) {
      try {
        transporter = nodemailer.createTransport({
          host,
          port,
          secure,
          auth: {
            user,
            pass,
          },
        });
        // Verify connection configuration
        await transporter.verify();
      } catch (authErr: any) {
        console.error('[SMTP Auth / Connection Failed]', authErr);
        mailDispatchError = `SMTP connection failed: ${authErr.message || authErr}`;
      }
    }

    for (const task of tasks) {
      // Only notify for pending tasks that have a deadline
      if (task.status === 'Done' || !task.deadline) {
        continue;
      }

      const taskDeadlineTime = new Date(task.deadline).getTime();
      const diffTime = taskDeadlineTime - todayTime;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Notify if due today, tomorrow, or in 2 days (diffDays between 0 and 2)
      if (diffDays >= 0 && diffDays <= 2) {
        const subject = `⏰ Diya Goal Reminder: "${task.title}" is due in ${diffDays === 0 ? 'today' : diffDays === 1 ? '1 day' : diffDays + ' days'}!`;
        const body = `
=========================================
📧 SYSTEM EMAIL DISPATCH
=========================================
TO: ${username || 'Student'} <${userEmail}>
FROM: Diya Cabinet Reminders <reminders@diya.academy>
SUBJECT: ${subject}
DATE: ${new Date().toLocaleString()}
-----------------------------------------
Hello ${username || 'Student'},

This is an automated notification from your Diya Study Cabinet.
The following goal is reaching its due date soon:

📌 Goal Title: ${task.title}
🏷️ Tag: ${task.category || 'General'}
⚡ Priority: ${task.priority || 'Medium'}
📅 Due Date: ${task.deadline}

Please make sure to review your study guides and proactive guides inside your Diya Desk Planner.

Keep up the great work!
--
Your Diya Proactive AI Assistant
=========================================
`;
        // Print the email dispatch to the server log for audit and verification
        console.log(body);

        // Attempt actual dispatch if transporter is active and verified
        if (transporter && !mailDispatchError) {
          try {
            await transporter.sendMail({
              from: `"Diya Cabinet Reminders" <${user}>`,
              to: userEmail,
              subject: subject,
              text: body.replace(/={5,}/g, '').replace(/-{5,}/g, '').trim(), // Clean up decorators for raw email
            });
            mailDispatchedCount++;
            console.log(`[Nodemailer] Email successfully dispatched to ${userEmail} for task "${task.title}"`);
          } catch (sendErr: any) {
            console.error(`[Nodemailer Send Fail] Task: ${task.title}`, sendErr);
            mailDispatchError = `Send error: ${sendErr.message || sendErr}`;
          }
        }

        notificationsSent.push({
          taskId: task.id,
          taskTitle: task.title,
          deadline: task.deadline,
          diffDays,
          recipient: userEmail,
          subject,
          body,
          dispatchedAt: new Date().toISOString()
        });
      }
    }

    return NextResponse.json({
      success: true,
      notificationsSent,
      smtpConfigured: !!(host && user && pass),
      mailDispatchedCount,
      mailDispatchError
    });

  } catch (error: any) {
    console.error('[Notification API Error]', error);
    return NextResponse.json({ error: error.message || 'Failed to dispatch reminders' }, { status: 500 });
  }
}
