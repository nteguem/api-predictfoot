const csvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require("fs");
const logger = require("../helpers/logger")

async function generateAndDownloadCSV(data,nameFile) {
    try {
      const csvHeader = Object.keys(data[0]).map(key => ({ id: key, title: key }));
      // Create CSV writer
      const csvWriterInstance = csvWriter({
        path: `${nameFile}_list.csv`,
        header: csvHeader
      });
  
      // Write users to CSV
      await csvWriterInstance.writeRecords(data);
  
      return `${nameFile}_list.csv`; // Return the path of the created CSV file
    } catch (error) {
      console.log('Error generating CSV file', error)
    }
  }
  
async function deleteCSVFile(filePath) {
    try {
        fs.unlinkSync(filePath);
    } catch (error) {
        console.log('Error deleting CSV file:', error);
    }
}

module.exports = {
    generateAndDownloadCSV,
    deleteCSVFile
};
