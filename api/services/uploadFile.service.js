const cloudinary = require("cloudinary/lib/cloudinary").v2;
          
     
cloudinary.config({ 
  cloud_name: 'nwccompany', 
  api_key: '982732848615931', 
  api_secret: 'fs_q0-h6SIcHzBhnORmd-3AtTQc' 
});

async function uploadToCloudinary(fileName, mediaData) {
  const publicId = fileName.includes('.') ? fileName : `${fileName}`;

  return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream({ resource_type: 'auto', public_id: publicId }, (error, result) => {
          if (!error) {
              const downloadLink = result.secure_url;
              resolve(downloadLink);
          } else {
              reject(error);
          }
      }).end(mediaData);
  });
}



module.exports = {uploadToCloudinary};
