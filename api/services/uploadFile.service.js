require('dotenv').config(); 

const cloudinary = require('cloudinary').v2;

// Configurer Cloudinary avec les variables d'environnement
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET 
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

module.exports = { uploadToCloudinary };
