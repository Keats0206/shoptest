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
    const { feedback, email, rating, wouldWear, textFeedback, haulId } = body;

    // Support both old format (feedback, email) and new format (rating, wouldWear, textFeedback, haulId)
    if (feedback) {
      // Old format - general feedback
      if (!feedback.trim()) {
        return NextResponse.json(
          { error: 'Feedback is required' },
          { status: 400 }
        );
      }
      // Mock sending the email
      await sendEmail('your-email@example.com', feedback, email);
    } else if (rating !== undefined && wouldWear) {
      // New format - drop feedback
      if (rating < 1 || rating > 5) {
        return NextResponse.json(
          { error: 'Rating must be between 1 and 5' },
          { status: 400 }
        );
      }
      if (!['yes', 'maybe', 'no'].includes(wouldWear)) {
        return NextResponse.json(
          { error: 'wouldWear must be yes, maybe, or no' },
          { status: 400 }
        );
      }
      
      // Log feedback (in production, you'd store this in a database)
      console.log('=== DROP FEEDBACK ===');
      console.log('Haul ID:', haulId);
      console.log('Rating:', rating);
      console.log('Would Wear:', wouldWear);
      console.log('Text Feedback:', textFeedback || '(none)');
      console.log('==================');
    } else {
      return NextResponse.json(
        { error: 'Either feedback or rating/wouldWear is required' },
        { status: 400 }
      );
    }

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
