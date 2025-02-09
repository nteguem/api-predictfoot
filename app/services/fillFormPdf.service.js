const { PDFDocument} = require('pdf-lib');
const { readFile } = require('fs/promises');
const path = require('path');

async function fillPdfFields(inputPath, data) {
    try {
        const resolvedInputPath = path.resolve(__dirname, inputPath);
        const pdfDoc = await PDFDocument.load(await readFile(resolvedInputPath));
        const form = pdfDoc.getForm();
        await fillTextFields(form, data);
        setFieldsReadOnly(form);

        form.flatten();
        const pdfBytes = await pdfDoc.save();
        return Buffer.from(pdfBytes, 'base64');
    } catch (err) {
        console.log('An error occurred:', err);
    }
}

async function fillTextFields(form, data) {
    for (const fieldName in data) {
        const fieldValue = data[fieldName];
        try {
            const field = form.getFieldMaybe(fieldName);
            if (field && field.constructor.name === 'PDFTextField') {
                field.setText(fieldValue);
            } else {
                console.log(`The field "${fieldName}" does not exist or is not a text field.`);
            }
        } catch (error) {
            console.log(`An error occurred while processing the field "${fieldName}":`, error.message);
        }
    }
}




function setFieldsReadOnly(form) {
    form.getFields().forEach(field => {
        if (field.enableReadOnly) {
            field.enableReadOnly();
        }
    });
}

module.exports = {
    fillPdfFields
};