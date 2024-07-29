const SPREADSHEET_ID = 'YOUR KEYWORD SHEET ID';

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
      .setTitle('HR Interview Dashboard')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}


function getCandidates() {
  try {
    var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Form responses 1');
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var candidates = [];

    // Find the indices of the columns we need
    var fullNameIndex = headers.indexOf('Full Name');
    var emailIndex = headers.indexOf('Email Address');
    var scorePercentageIndex = headers.indexOf('Score Percentage');

    // If Score Percentage doesn't exist, we'll calculate it from Keyword Score
    var keywordScoreIndex = headers.indexOf('Keyword Score');
    var totalKeywords = getKeywords().length; // Assuming you have this function

    if (fullNameIndex === -1 || emailIndex === -1) {
      throw new Error('Required columns not found');
    }

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var scorePercentage;
      
      if (scorePercentageIndex !== -1) {
        scorePercentage = row[scorePercentageIndex];
      } else if (keywordScoreIndex !== -1) {
        // Calculate score percentage if it doesn't exist
        var keywordScore = row[keywordScoreIndex];
        scorePercentage = (keywordScore / totalKeywords) * 100;
      } else {
        scorePercentage = 'N/A';
      }

      var candidate = {
        "Full Name": row[fullNameIndex],
        "Email Address": row[emailIndex],
        "Score Percentage": scorePercentage
      };

      candidates.push(candidate);
    }

    Logger.log("Candidates data: " + JSON.stringify(candidates)); // For debugging
    return JSON.stringify(candidates);
  } catch (error) {
    Logger.log("Error in getCandidates: " + error.toString());
    return JSON.stringify([]);
  }
}

function sendInterviewEmail(candidateEmail, candidateName, interviewDate, interviewTime) {
  var subject = "Interview Invitation";
  var body = `Dear ${candidateName},

We are pleased to invite you for an interview for the position you applied for. The details are as follows:

Date: ${interviewDate}
Time: ${interviewTime}

Please confirm your availability for this slot. If you need to reschedule, please let us know as soon as possible.

Best regards,
HR Team`;

  try {
    MailApp.sendEmail(candidateEmail, subject, body);
    return "Email sent successfully to " + candidateEmail;
  } catch (error) {
    Logger.log("Error sending email: " + error.toString());
    return "Failed to send email: " + error.message;
  }
}

// Utility function to get sheet by name
function getSheetByName(sheetName) {
  return SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(sheetName);
}