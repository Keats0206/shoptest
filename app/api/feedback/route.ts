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
  console.log('Subject: New Feedback from StyleRun');
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
      if (typeof feedback !== 'string' || !feedback.trim()) {
        return NextResponse.json(
          { error: 'Feedback is required and must be a non-empty string' },
          { status: 400 }
        );
      }
      
      // Sanitize feedback length
      if (feedback.length > 5000) {
        return NextResponse.json(
          { error: 'Feedback is too long (max 5000 characters)' },
          { status: 400 }
        );
      }
      
      // Validate email format if provided
      if (email && typeof email === 'string' && email.length > 0) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email) || email.length > 255) {
          return NextResponse.json(
            { error: 'Invalid email format' },
            { status: 400 }
          );
        }
      }
      
      // Mock sending the email
      await sendEmail('your-email@example.com', feedback.trim(), email);
    } else if (rating !== undefined && wouldWear) {
      // New format - drop feedback
      if (typeof rating !== 'number' || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
        return NextResponse.json(
          { error: 'Rating must be an integer between 1 and 5' },
          { status: 400 }
        );
      }
      
      if (typeof wouldWear !== 'string' || !['yes', 'maybe', 'no'].includes(wouldWear.toLowerCase())) {
        return NextResponse.json(
          { error: 'wouldWear must be "yes", "maybe", or "no"' },
          { status: 400 }
        );
      }
      
      // Validate textFeedback if provided
      if (textFeedback !== undefined && textFeedback !== null) {
        if (typeof textFeedback !== 'string') {
          return NextResponse.json(
            { error: 'textFeedback must be a string' },
            { status: 400 }
          );
        }
        if (textFeedback.length > 2000) {
          return NextResponse.json(
            { error: 'textFeedback is too long (max 2000 characters)' },
            { status: 400 }
          );
        }
      }
      
      // Validate haulId if provided
      if (haulId !== undefined && haulId !== null) {
        if (typeof haulId !== 'string' || haulId.length > 255) {
          return NextResponse.json(
            { error: 'haulId must be a string with max 255 characters' },
            { status: 400 }
          );
        }
      }
      
      // Log feedback (in production, you'd store this in a database)
      console.log('=== DROP FEEDBACK ===');
      console.log('Haul ID:', haulId || '(none)');
      console.log('Rating:', rating);
      console.log('Would Wear:', wouldWear.toLowerCase());
      console.log('Text Feedback:', textFeedback ? textFeedback.trim() : '(none)');
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
