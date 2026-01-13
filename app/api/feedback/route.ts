import { NextRequest, NextResponse } from 'next/server';

// Mock email sending function
async function sendEmail(email: string, feedback: string, userEmail?: string) {
  // In a real implementation, you would use a service like:
  // - Resend (resend.com)
  // - SendGrid
  // - AWS SES
  // - Nodemailer with SMTP
  
  // For now, we'll just log it and return success
  console.log('=== FEEDBACK EMAIL (MOCKED) ===');
  console.log('To: your-email@example.com');
  console.log('From:', userEmail || 'anonymous');
  console.log('Subject: New Feedback from ShopPal');
  console.log('Body:', feedback);
  console.log('==============================');
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return { success: true };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { feedback, email } = body;

    if (!feedback || !feedback.trim()) {
      return NextResponse.json(
        { error: 'Feedback is required' },
        { status: 400 }
      );
    }

    // Mock sending the email
    await sendEmail('your-email@example.com', feedback, email);

    return NextResponse.json(
      { message: 'Feedback sent successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error processing feedback:', error);
    return NextResponse.json(
      { error: 'Failed to send feedback' },
      { status: 500 }
    );
  }
}
