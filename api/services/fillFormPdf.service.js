const { PDFDocument ,rgb} = require('pdf-lib');
const { readFile } = require('fs/promises');
const path = require('path');

async function fillPdfFields(inputPath, data) {
    try {
        const resolvedInputPath = path.resolve(__dirname, inputPath);
        const pdfDoc = await PDFDocument.load(await readFile(resolvedInputPath));
        const form = pdfDoc.getForm();

        await fillTextFields(form, data);
        await fillRadioFields(form, data, 'civility', ['Monsieur', 'Madame']);
        await fillRadioFields(form, data, 'typeProfession', [
            'Fonctionnaire/Salarié du secteur public',
            'Etudiant',
            'Planteur/Exploitant rural',
            'Salarié du secteur privé',
            'Commerçant et entrepreneur individuel',
            'Agent d’organismes internationaux',
            'Profession Libérale',
            'Autre'
        ]);
        await fillRadioFields(form, data, 'maritalStatus', ['Célibataire', 'Marié.e', 'Divorcé.e', 'Veuf.ve']);
        await fillRadioFields(form, data, 'typeDocument', ["Carte d'identité", 'Passeport', 'Carte de Séjour']);
        await fillRadioFields(form, data, 'methodPaiementFCP', ['Virement', 'Mobile money (OM|MOMO)']);
        await fillRadioFields(form, data, 'investmentObjective', [
            'Diversification du patrimoine',
            'Revenus complémentaires',
            'Transmission du patrimoine',
            'Diversification de placement',
            'Placement de trésorerie',
            'Rendement',
            'Autres'
        ]);
        await fillRadioFields(form, data, 'financialMarketExperience', ['Oui', 'Non']);
        await fillRadioFields(form, data, 'investmentHorizon', ['Court-terme', 'Moyen-terme', 'Long-terme']);
        await fillRadioFields(form, data, 'capitalOrigin', ['épargne', 'crédit', 'cession d\'actifs', 'fonds propres', 'héritage familiale']);

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
        if (['civility', 'typeProfession', 'maritalStatus', 'typeDocument', 'methodPaiementFCP', 'investmentObjective', 'financialMarketExperience', 'investmentHorizon', 'capitalOrigin'].includes(fieldName)) {
            continue;
        }

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

async function fillRadioFields(form, data, fieldName, validOptions) {
    const fieldValue = data[fieldName];
    if (validOptions.includes(fieldValue)) {
        const radioField = form.getFieldMaybe(fieldValue);
        if (radioField && radioField.constructor.name === 'PDFCheckBox') {
             radioField.check();
            radioField.defaultUpdateAppearances();
        } else {
            console.log(`The radio button for "${fieldValue}" does not exist or is not a checkbox.`);
        }
    } else {
        console.log(`Invalid ${fieldName} value: ${fieldValue}`);
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