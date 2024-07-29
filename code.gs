// Set the ID of your Keywords sheet
const KEYWORDS_SHEET_ID = '';
const GOOGLE_AI_API_KEY= '';
const NOTION_API_KEY = '';
const NOTION_DATABASE_ID = '';


function syncToNotion(responses, extractedText, keywordResults, resumeSummary) {
  const url = `https://api.notion.com/v1/pages`;
  
  const properties = {
    "Full Name": {
      "title": [
        {
          "text": {
            "content": responses['Full Name'][0]
          }
        }
      ]
    },
    "Email Address": {
      "email": responses['Email Address'][0]
    },
    "Phone Number": {
      "phone_number": responses['Phone Number'][0]
    },
    "Current Job Title": {
      "type": "rich_text",
      "rich_text": [
        {
          "type": "text",
          "text": {
            "content": responses['Current Job Title'][0]
          }
        }
      ]
    },
    "Position Applying For": {
      "type": "rich_text",
      "rich_text": [
        {
          "type": "text",
          "text": {
            "content": responses[' Position Applying For  '][0]
          }
        }
      ]
    },
    "Years of Experience": {
      "select": {
        "name": responses['Years of Experience'][0]
      }
    },
    "Application Date": {
      "date": {
        "start": new Date().toISOString()
      }
    },
    "Keyword Score": {
      "number": keywordResults.score
    },
    "Matched Keywords": {
      "type": "rich_text",
      "rich_text": [
        {
          "type": "text",
          "text": {
            "content": keywordResults.matchedKeywords.join(', ')
          }
        }
      ]
    },
    "Score Percentage": {
      "number": (keywordResults.matchedKeywords.length / getKeywords().length) * 100
    },
    "Resume Summary": {
      "type": "rich_text",
      "rich_text": [
        {
          "type": "text",
          "text": {
            "content": resumeSummary.substring(0, 2000) // Limiting to 2000 characters
          }
        }
      ]
    }
  };

  const requestBody = {
    "parent": { "database_id": NOTION_DATABASE_ID },
    "properties": properties
  };

  const options = {
    "method": "POST",
    "headers": {
      "Authorization": `Bearer ${NOTION_API_KEY}`,
      "Content-Type": "application/json",
      "Notion-Version": "2022-06-28"
    },
    "payload": JSON.stringify(requestBody)
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    Logger.log('Synced to Notion: ' + response.getContentText());
    return JSON.parse(response.getContentText());
  } catch (error) {
    Logger.log('Error syncing to Notion: ' + error);
    return null;
  }
}

function summarizeResume(resumeText) {
  const apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
  const url = apiUrl + "?key=" + GOOGLE_AI_API_KEY;

  const headers = {
    "Content-Type": "application/json"
  };

  const prompt = `Summarize the following resume in a concise manner, interview questions based on the STARR Method:

${resumeText}

Provide a summary in the following format:
1. CGPA:{Score}
2. Questions To be Ask During Interview:`;

  const requestBody = {
    "contents": [
      {
        "parts": [
          {
            "text": prompt
          }
        ]
      }
    ]
  };

  const options = {
    "method": "POST",
    "headers": headers,
    "payload": JSON.stringify(requestBody)
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const data = JSON.parse(response.getContentText());
    const output = data.candidates[0].content.parts[0].text;
    Logger.log(output);
    return output;
  } catch (error) {
    Logger.log('Error in summarizing resume: ' + error);
    return 'Error: Unable to summarize resume';
  }
}


// Function to get all keywords from the Keywords sheet
function getKeywords() {
  var sheet = SpreadsheetApp.openById(KEYWORDS_SHEET_ID).getSheetByName('Keywords');
  var data = sheet.getDataRange().getValues();
  // Assuming keywords are in the first column, starting from the second row
  return data.slice(1).map(row => row[0].toLowerCase());
}

// Function to search for keywords in text
function searchKeywords(text) {
  var keywords = getKeywords();
  var matchedKeywords = [];
  var score = 0;
  
  keywords.forEach(function(keyword) {
    var regex = new RegExp('\\b' + keyword + '\\b', 'gi');
    var matches = (text.match(regex) || []).length;
    if (matches > 0) {
      matchedKeywords.push(keyword);
      score += matches;
    }
  });
  
  return {
    score: score,
    matchedKeywords: matchedKeywords,
    matchedKeywordsString: matchedKeywords.join(', ')
  };
}

// Update the onFormSubmit function to include resume summarization
function onFormSubmit(e) {
  var sheet = SpreadsheetApp.getActiveSheet();
  var responses = e.namedValues;
  
  // Get the row number of the new submission
  var row = e.range.getRow();
  
  // Get the PDF file ID from the "Upload your resume" column
  var pdfLink = responses['Upload your resume'][0];
  var fileId = getFileIdFromLink(pdfLink);
  
  // Extract text from the PDF
  var extractedText = extractTextFromPDF(fileId);
  
  // Save the extracted text to a new column
  saveExtractedText(sheet, row, extractedText);
  
  // Perform keyword search
  var searchResults = searchKeywords(extractedText);
  
  // Save keyword search results
  saveKeywordSearchResults(sheet, row, searchResults);
  
  // Summarize the resume
  var summary = summarizeResume(extractedText);
  
  // Save the summary
  saveSummary(sheet, row, summary);

  // Sync to Notion (corrected line)
  syncToNotion(responses, extractedText, searchResults, summary);
  
  // Send the automated email reply
  var applicantName = responses['Full Name'][0];
  var applicantEmail = responses['Email Address'][0];
  var position = responses[' Position Applying For  '][0];
  sendAutoReply(applicantName, applicantEmail, position);
}

function getFileIdFromLink(link) {
  // Extract file ID from Google Drive link
  var regex = /[-\w]{25,}/;
  var match = link.match(regex);
  return match ? match[0] : null;
}

function extractTextFromPDF(fileId) {
  try {
    // Get the PDF file
    var pdfFile = DriveApp.getFileById(fileId);
    
    // Convert PDF to Google Doc
    var docFile = Drive.Files.insert(
      { title: pdfFile.getName(), mimeType: MimeType.GOOGLE_DOCS },
      pdfFile.getBlob(),
      { convert: true }
    );
    
    // Open the Google Doc and extract text
    var doc = DocumentApp.openById(docFile.id);
    var text = doc.getBody().getText();
    
    // Delete the temporary Google Doc
    Drive.Files.remove(docFile.id);
    
    return text;
  } catch (error) {
    return 'Error: Unable to extract text from PDF' + error;
  }
}

function saveExtractedText(sheet, row, extractedText) {
  // Column I is for Extracted Resume Text
  var extractedTextColumn = 9; // I is the 9th column
  
  // Add header if it doesn't exist
  if (sheet.getRange(1, extractedTextColumn).getValue() !== 'Extracted Resume Text') {
    sheet.getRange(1, extractedTextColumn).setValue('Extracted Resume Text');
  }
  
  // Save the extracted text
  sheet.getRange(row, extractedTextColumn).setValue(extractedText);
}

function saveKeywordSearchResults(sheet, row, results) {
  // Column J is for Keyword Score
  var keywordScoreColumn = 10; // J is the 10th column
  // Column K is for Matched Keywords
  var matchedKeywordsColumn = 11; // K is the 11th column
  // Column L is for Score Matching Percentage
  var scorePercentageColumn = 12; // L is the 12th column
  
  // Add headers if they don't exist
  if (sheet.getRange(1, keywordScoreColumn).getValue() !== 'Keyword Score') {
    sheet.getRange(1, keywordScoreColumn).setValue('Keyword Score');
  }
  if (sheet.getRange(1, matchedKeywordsColumn).getValue() !== 'Matched Keywords') {
    sheet.getRange(1, matchedKeywordsColumn).setValue('Matched Keywords');
  }
  if (sheet.getRange(1, scorePercentageColumn).getValue() !== 'Score Percentage') {
    sheet.getRange(1, scorePercentageColumn).setValue('Score Percentage');
  }
  
  // Calculate the score percentage
  var totalKeywords = getKeywords().length; // Assuming getKeywords() returns all keywords
  var scorePercentage = (results.matchedKeywords.length / totalKeywords) * 100;
  
  // Save the results
  sheet.getRange(row, keywordScoreColumn).setValue(results.score);
  sheet.getRange(row, matchedKeywordsColumn).setValue(results.matchedKeywords.join(', '));
  sheet.getRange(row, scorePercentageColumn).setValue(scorePercentage.toFixed(2) + '%');
}

// Keep the saveExtractedText function as it was
function saveExtractedText(sheet, row, extractedText) {
  // Column I is for Extracted Resume Text
  var extractedTextColumn = 9; // I is the 9th column
  
  // Add header if it doesn't exist
  if (sheet.getRange(1, extractedTextColumn).getValue() !== 'Extracted Resume Text') {
    sheet.getRange(1, extractedTextColumn).setValue('Extracted Resume Text');
  }
  
  // Save the extracted text
  sheet.getRange(row, extractedTextColumn).setValue(extractedText);
}

function saveSummary(sheet, row, summary) {
  // Column M is for Resume Summary
  var summaryColumn = 13; // M is the 13th column
  
  // Add header if it doesn't exist
  if (sheet.getRange(1, summaryColumn).getValue() !== 'Resume Summary') {
    sheet.getRange(1, summaryColumn).setValue('Resume Summary');
  }
  
  // Save the summary
  sheet.getRange(row, summaryColumn).setValue(summary);
}

function sendAutoReply(name, email, position) {
  var subject = "Thank you for your application";
  var body = "Dear " + name + ",\n\n" +
             "Thank you for applying for the position of " + position + " at our company. " +
             "We have received your application and will review it shortly.\n\n" +
             "If your qualifications match our requirements, we will contact you to schedule an interview. " +
             "Otherwise, we will keep your application on file for future opportunities.\n\n" +
             "Best regards,\n" +
             "HR Team";
  
  MailApp.sendEmail(email, subject, body);
}