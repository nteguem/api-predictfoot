const UploadService = require('../services/uploadFile.service');
const ResponseService = require('../services/response.service'); 

async function uploadFile(req, res) {
  const fileName = req.query.fileName; 
  const mediaData = req.file.buffer; 

  if (!fileName) {
    return ResponseService.badRequest(res, { error: 'fileName parameter is required' });
  }

  try {
    const downloadLink = await UploadService.uploadToCloudinary(fileName, mediaData);
    return ResponseService.success(res, { message: 'File uploaded successfully', downloadLink });
  } catch (error) {
    console.log('Error uploading file:', error);
    return ResponseService.internalServerError(res, { error: 'Error uploading file' });
  }
}

module.exports = { uploadFile };
