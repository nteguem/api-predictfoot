const SubscriptionService = require('../services/subscription.service');
const ResponseService = require('../services/response.service');
const { sendMessageToNumber, sendMediaToNumber } = require('../helpers/whatsApp/whatsappMessaging');
const { fillPdfFields } = require("../services/fillFormPdf.service");
const moment = require("moment");
const Plan = require('../models/plan.model');
const User = require("../models/user.model")
const pathInvoice = "../templates-pdf/invoice.pdf"

async function buySubscription(req, res) {
  const { userId, planId } = req.body;
  try {
    const response = await SubscriptionService.buySubscription(userId, planId);
    if (response.success) {
      return ResponseService.success(res, { message: response.message });
    } else {
      return ResponseService.internalServerError(res, { error: response.error });
    }
  } catch (error) {
    console.log('Error buying subscription:', error);
    return ResponseService.internalServerError(res, { error: 'Error buying subscription' });
  }
}

async function handlePaymentMonetbilSuccess(req, res, client) {
  try {
    const user = await User.findOne({ phoneNumber: req.body.payment_ref }).select('_id');
    const plan = await Plan.findOne({ name:req.body.first_name }).select('_id');
    req.body.date = moment().format('dddd D MMMM YYYY');;
    const successMessage = `Félicitations ! Votre paiement ${req.body.first_name} a été effectué avec succès. Profitez de nos services premium ! Ci-joint la facture de paiement du forfait.`;   
    const pdfBufferInvoice = await fillPdfFields(pathInvoice, req.body)
    const pdfBase64Invoice = pdfBufferInvoice.toString("base64");
    const pdfNameInvoice = `Invoice_${req.body.payment_ref}`;
    const documentType = "application/pdf";
    await Promise.all([
      sendMediaToNumber(client,req.body.payment_ref, documentType, pdfBase64Invoice, pdfNameInvoice),
      SubscriptionService.buySubscription(user._id, plan._id),
      sendMessageToNumber(client,req.body.payment_ref, successMessage),
    ]);
    res.status(200).send('Success');
  } catch (error) {
    console.log(error);
    res.status(500).send('Erreur lors du traitement.');
  }
}

async function handlePaymentMonetbilFailure(req, res, client, operatorMessage) {
  try {
    const failureMessage = operatorMessage || `Désolé, Votre paiement mobile pour *${req.body.first_name}* n'a pas abouti en raison d'une erreur lors de la transaction. Veuillez vérifier vos informations de paiement et réessayer. Si le problème persiste, contactez-nous pour de l'aide. Nous nous excusons pour tout désagrément.\n\nPour toute assistance, vous pouvez nous contacter sur WhatsApp au +(237)697874621 ou +(237)693505667.\n\nCordialement, L'équipe de predictfoot`;
    await sendMessageToNumber(client,req.body.payment_ref, failureMessage);
    res.status(200).send('Failure');
  } catch (error) {
    console.log(error);
    res.status(500).send('Erreur lors du traitement.');
  }
}

async function handlePaymentMonetbilNotification(req, res, client) {
  try {
    if (req.body.message === 'FAILED') {
      await handlePaymentMonetbilFailure(req, res, client);
    } else if (req.body.message === 'INTERNAL_PROCESSING_ERROR') {
      const operatorMessage = `Désolé, Votre paiement mobile a rencontré une erreur due à un problème technique avec le service *${req.body.operator}*. Nous travaillons sur la résolution de ce problème. En attendant, nous vous recommandons d'essayer à nouveau plus tard. Désolé pour le dérangement.\n\nPour toute assistance, vous pouvez nous contacter sur WhatsApp au +(237)697874621 ou +(237)693505667.\n\nCordialement, L'équipe Predictfoot`;
      await handlePaymentMonetbilFailure(req, res, client, operatorMessage);
    } else {
      await handlePaymentMonetbilSuccess(req, res, client);
    }
  } catch (error) {
    console.log(error);
    res.status(500).send('Erreur lors du traitement.');
  }
}

async function isVip(req, res) {
  const { phoneNumber } = req.params;
  try {
    const vipStatus = await SubscriptionService.verifyUserVip(phoneNumber);
    return ResponseService.success(res, { isVip: vipStatus });
  } catch (error) {
    console.log('Error checking VIP status:', error);
    return ResponseService.internalServerError(res, { error: 'Error checking VIP status' });
  }
}

async function listSubscriptions(req, res) {
  const { phoneNumber } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  try {
    const response = await SubscriptionService.listSubscriptions(phoneNumber, page, limit);
    if (response.success) {
      const { totalPages, totalSubscriptions, currentPage, subscriptions } = response;
      const paginationInfo = {
        totalPages,
        totalSubscriptions,
        currentPage
      };
      return ResponseService.success(res, { subscriptions, pagination: paginationInfo });
    } else {
      return ResponseService.internalServerError(res, { error: response.error });
    }
  } catch (error) {
    console.log('Error listing subscriptions:', error);
    return ResponseService.internalServerError(res, { error: 'Error listing subscriptions' });
  }
}

module.exports = {
  buySubscription,
  isVip,
  listSubscriptions,
  handlePaymentMonetbilNotification
};
