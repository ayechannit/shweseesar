const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
require('dotenv').config();

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const uploadToS3 = async (file) => {
    const fileName = `${Date.now()}-${file.originalname}`;
    const command = new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
    });

    try {
        await s3Client.send(command);
        return fileName;
    } catch (err) {
        console.error("S3 Upload Error:", err);
        throw err;
    }
};

const getS3SignedUrl = async (key, originalName) => {
    if (!key) return null;
    const command = new GetObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
        ResponseContentDisposition: `attachment; filename="${originalName || key.split('-').slice(1).join('-') || key}"`
    });

    try {
        const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour
        return url;
    } catch (err) {
        console.error("S3 Signed URL Error:", err);
        throw err;
    }
};

module.exports = {
    uploadToS3,
    getS3SignedUrl
};
