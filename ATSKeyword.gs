// Set the ID of your Keywords sheet
const KEYWORDS_SHEET_ID = "YOUR_SHEET_ID";

// Function to get all keywords from the Keywords sheet
function getKeywords() {
  var sheet =
    SpreadsheetApp.openById(KEYWORDS_SHEET_ID).getSheetByName("Keywords");
  var data = sheet.getDataRange().getValues();
  // Assuming keywords are in the first column, starting from the second row
  return data.slice(1).map((row) => row[0]);
}

// Function to add a new keyword
function addKeyword(keyword) {
  var sheet =
    SpreadsheetApp.openById(KEYWORDS_SHEET_ID).getSheetByName("Keywords");
  sheet.appendRow([keyword]);
  return getKeywords(); // Return updated list
}

// Function to delete a keyword
function deleteKeyword(keyword) {
  var sheet =
    SpreadsheetApp.openById(KEYWORDS_SHEET_ID).getSheetByName("Keywords");
  var data = sheet.getDataRange().getValues();
  for (var i = data.length - 1; i >= 1; i--) {
    if (data[i][0] === keyword) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
  return getKeywords(); // Return updated list
}

// Function to generate the HTML for the web app
function doGet() {
  return HtmlService.createHtmlOutput(getHtml())
    .setTitle("Keyword Management")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Function to get the HTML content
function getHtml() {
  return `
<!DOCTYPE html>
<html>
  <head>
    <base target="_top">
    <style>
      body { font-family: Arial, sans-serif; margin: 20px; }
      input, button { margin: 5px; padding: 5px; }
      ul { list-style-type: none; padding: 0; }
      li { margin: 5px 0; }
    </style>
  </head>
  <body>
    <h2>Keyword Management</h2>
    <input type="text" id="keywordInput" placeholder="Enter a keyword">
    <button onclick="addKeyword()">Add Keyword</button>
    <h3>Current Keywords:</h3>
    <ul id="keywordList"></ul>

    <script>
      // Load keywords when the page loads
      google.script.run.withSuccessHandler(updateKeywordList).getKeywords();

      function addKeyword() {
        var keyword = document.getElementById('keywordInput').value;
        if (keyword) {
          google.script.run.withSuccessHandler(updateKeywordList).addKeyword(keyword);
          document.getElementById('keywordInput').value = '';
        }
      }

      function deleteKeyword(keyword) {
        google.script.run.withSuccessHandler(updateKeywordList).deleteKeyword(keyword);
      }

      function updateKeywordList(keywords) {
        var list = document.getElementById('keywordList');
        list.innerHTML = '';
        keywords.forEach(function(keyword) {
          var li = document.createElement('li');
          li.textContent = keyword + ' ';
          var deleteButton = document.createElement('button');
          deleteButton.textContent = 'Delete';
          deleteButton.onclick = function() { deleteKeyword(keyword); };
          li.appendChild(deleteButton);
          list.appendChild(li);
        });
      }
    </script>
  </body>
</html>
  `;
}
