# TTB Label Verifier

An AI-powered alcohol label verification tool built for the TTB (Alcohol and Tobacco Tax and Trade Bureau) Compliance Division. This application allows compliance agents to upload label images and automatically verify them against application data using Claude AI vision.

## Live Application

https://treas-take-home-label-verifer.vercel.app

## Features

- **AI-Powered Label Analysis** � Uses Claude claude-sonnet-4-5 vision to read and analyze label images
- **Field-by-Field Verification** � Checks brand name, class/type, alcohol content, net contents, bottler name and address, country of origin, and government warning
- **Exact Government Warning Validation** � Verifies the mandatory TTB warning statement word-for-word, including required all-caps formatting
- **Batch Processing** � Queue multiple labels and process them all at once
- **Fast Results** � Analysis returns in under 5 seconds per label
- **Simple UI** � Clean, accessible interface designed for all technical skill levels
- **Fuzzy Match Judgment** � AI handles minor formatting differences (e.g. capitalization variations) intelligently

## Setup and Run Instructions

### Prerequisites

- Node.js 18 or higher
- An Anthropic API key (https://console.anthropic.com)

### Installation

1. Clone the repository:

git clone https://github.com/ry304/treas-take-home-label-verifer.git
cd treas-take-home-label-verifer

2. Install dependencies:

npm install

3. Create a `.env.local` file in the project root:

ANTHROPIC_API_KEY=your-api-key-here

4. Start the development server:

npm run dev

5. Open http://localhost:3000 in your browser.

### Production Build

5. Open http://localhost:3000 in your browser.

### Production Build

npm run build
npm start

## How to Use

1. Fill in the application data fields (brand name, class/type, alcohol content, etc.)
2. Upload one or more label images using the file picker
3. Click **Add to Queue**
4. Repeat for additional labels if needed
5. Click **Process Queue** to run AI verification on all queued labels
6. Review the pass/fail results for each field

## Bulk Import Workflow

1. Open the **Bulk Import** section at the top of the page.
2. Download the built-in CSV template or prepare a CSV/Excel file with these columns:
   - Brand Name
   - Class/Type
   - Alcohol Content
   - Net Contents
   - Bottler Name & Address
   - Country of Origin
   - Image Filename
3. Upload the CSV or Excel file using the bulk file picker.
4. Upload the matching label image files using the bulk image picker.
5. Click **Import All to Queue** to add all matched rows to the queue.
6. The app matches images automatically by filename using the `Image Filename` column.
7. If any rows do not have a matching image, a warning is shown.

## Approach and Technical Decisions

### Architecture

The application is built as a Next.js app with a server-side API route that proxies requests to the Anthropic API. This ensures the API key is never exposed to the browser.

- **Frontend:** Next.js 15 with React and Tailwind CSS
- **Backend:** Next.js API route (`/api/verify`) running server-side
- **AI Model:** Claude claude-sonnet-4-5 (Anthropic) with vision capabilities
- **Deployment:** Vercel

### Why Claude Vision?

Claude's vision API was chosen because it handles the core requirements naturally � reading text from images, applying judgment to minor formatting differences, and validating exact text matches like the government warning statement. It also handles poor image quality and angled label photos gracefully, which was a stated requirement from the compliance team.

### Government Warning Validation

The required TTB government warning statement is hardcoded server-side and passed to the model as the exact expected text. The model is instructed to flag any deviation in wording, capitalization, or punctuation as a failure.

### Batch Processing

Labels are queued client-side with their associated application data and images (base64 encoded). When the queue is processed, each label is sent to the API route sequentially and results are displayed inline.

### Security

The Anthropic API key is stored as a server-side environment variable and never sent to the client. Label images are base64 encoded in the browser and sent directly to the server for processing and are not stored.

## Assumptions Made

- Labels may contain required information across multiple panels — the app analyzes only the image provided and cannot verify information on panels not captured in the uploaded photo
- The government warning statement follows the standard TTB format for all beverage types
- The app processes labels sequentially rather than in parallel — very large batch queues will take longer to process as each label is verified individually
- Reporting is generated client-side at the time of verification — reports reflect the AI analysis at that moment and are not stored or retrievable after the session ends
- Minor capitalization differences in brand names are flagged but noted as likely matches, per feedback from experienced agents

## Tools Used

- Next.js 15
- React 18
- Tailwind CSS
- Anthropic Claude API (claude-sonnet-4-5)
- Vercel (deployment)
- Node.js
