const SubscriptionService = require('../services/subscription.service');
const ResponseService = require('../services/response.service');
const userService = require("../services/user.service");
const { updateTransaction } = require('../services/transaction.service');
const { sendDeviceNotification } = require('../services/notification.service');
const logService = require('../services/log.service');
const { sendMessageToNumber, sendMediaToNumber } = require('../views/whatsApp/whatsappMessaging');
const { fillPdfFields } = require("../services/fillFormPdf.service");
const moment = require("moment");
const pathInvoice = "../templates-pdf/invoice.pdf"

const NAVIGATION_SUFFIX = "\n\n_Tapez * pour revenir en arrière, # pour revenir au menu principal._";

async function handlePaymentMonetbilSuccess(req, res, client) {
  try {
    const { item_ref, transaction_id, phonenumber, phone, operator_transaction_id } = req.body;
    const dataItemRef = JSON.parse(item_ref);
    const { user, plan, fcmToken } = dataItemRef;
    const currentDate = moment().format('dddd D MMMM YYYY');
    const currentTime = moment().format('HH:mm:ss');
    const expire = moment().add(plan?.duration, 'days').format('dddd D MMMM YYYY');
    req.body = {
      ...req.body, date: currentDate,
      pseudo: user?.pseudo,
      forfait: plan?.name,
      date: currentDate,
      phonenumber: phonenumber ? phonenumber.toString() : phone.toString(),
      heure: currentTime,
      expire,
      transaction_id: operator_transaction_id,
      transaction_id: operator_transaction_id,
      prix: plan?.price.toString(),
      whatsapp: user.phoneNumber.toString()
    };
    // Préparation des données de mise a jour de la transaction
    const transactionData = {
      operatorTransactionId: operator_transaction_id,
      status: "COMPLETED",
    };

    // Preparation de la facture pdf du client
    const successMessage = `Félicitations, ${user.pseudo} ! Votre paiement de ${plan.price} pour le forfait ${plan.name} a été validé avec succès. Vous trouverez ci-joint votre facture.${NAVIGATION_SUFFIX}`;
    const pdfBufferInvoice = await fillPdfFields(pathInvoice, req.body);
    const pdfBase64Invoice = pdfBufferInvoice.toString('base64');
    const pdfNameInvoice = `Invoice_${user.phoneNumber}`;
    const documentType = 'application/pdf';

    // Notification sur l'application mobile 
    if (fcmToken) {
      const notificationData = {
        title: '🌟 Forfait VIP Activé !',
        body: [
          'Félicitations ! Votre forfait VIP est maintenant actif.',
          `✨ Accès Premium débloqué pour ${plan?.duration} jours`,
          '📊 Prédictions exclusives disponibles',
          '🎯 Pronostics à fort taux de réussite'
        ].join('\n'),
        data: {
          type: 'subscription_notification',
          subscriptionId: 'operator_transaction_id',
          packageType: 'VIP',
          user: JSON.stringify(user),
          startDate: currentDate,
          expiryDate: expire,
          features: [
            'predictions_vip',
          ].join(','),
          status: 'active',
          price: String(plan?.price),
          currency: 'XAF'
        }
      };
      await sendDeviceNotification(fcmToken, notificationData);
    }
    // Envoi de la notification , generation de facture client et mise a jour de la transaction
    await Promise.all([
      sendMediaToNumber(client, user.phoneNumber, documentType, pdfBase64Invoice, pdfNameInvoice, successMessage),
      updateTransaction(transaction_id, transactionData)
    ]);

    // Notification aux administrateurs
    const { users: admins } = await userService.list("admin");
    const adminMessage = `Un client (${user.pseudo || user.phoneNumber}) a effectué un achat de ${plan.price} pour le forfait ${plan.name}. Veuillez trouver la facture en pièce jointe.${NAVIGATION_SUFFIX}`;

    for (const admin of admins) {
      await sendMediaToNumber(client, admin.phoneNumber, documentType, pdfBase64Invoice, pdfNameInvoice);
      await sendMessageToNumber(client, admin.phoneNumber, adminMessage);
    }
    res.status(200).send('Success');
  }
  catch (error) {
    await logService.addLog(
      `${error.message}`,
      'handlePaymentMonetbilSuccess',
      'error'
    );
    return ResponseService.internalServerError(res, { error: 'Erreur lors du traitement' });
  }
}

async function handlePaymentMonetbilFailure(req, res, client, operatorMessage) {
  try {
    const { item_ref, transaction_id, status } = req.body;
    const dataItemRef = JSON.parse(item_ref);
    const { user, plan } = dataItemRef;
    const failureMessage = (operatorMessage || `Désolé, Votre paiement  de ${plan.price} pour le forfait ${plan.name} n'a pas abouti en raison d'une erreur lors de la transaction. Veuillez vérifier vos informations de paiement et réessayer. Si le problème persiste, contactez-nous pour de l'aide. Nous nous excusons pour tout désagrément.\n\nPour toute assistance conctater le numéro 697874621.\n\nCordialement,\n\n L'équipe de bigwin`) + NAVIGATION_SUFFIX;

    // Préparation des données de mise a jour de la transaction
    const transactionData = {
      status
    };

    await Promise.all([
      sendMessageToNumber(client, user.phoneNumber, failureMessage),
      updateTransaction(transaction_id, transactionData)
    ]);
    res.status(200).send('Failure');
  } catch (error) {
    await logService.addLog(
      `${error.message}`,
      'handlePaymentMonetbilFailure',
      'error'
    );
    return ResponseService.internalServerError(res, { error: 'Erreur lors du traitement' });
  }
}

async function handlePaymentMonetbilNotification(req, res, client) {
  try {
    if (req.body.message.toLowerCase() === 'failed') {
      await handlePaymentMonetbilFailure(req, res, client);
    } else if (req.body.message.toLowerCase() === 'internal_processing_error') {
      const operatorMessage = `Désolé, Votre paiement mobile a rencontré une erreur due à un problème technique avec le service *${req.body.operator}*. Nous travaillons sur la résolution de ce problème. En attendant, nous vous recommandons d'essayer à nouveau plus tard. Désolé pour le dérangement.\n\nPour toute assistance,conctater le numéro 697874621.\n\n L'équipe  bigwin${NAVIGATION_SUFFIX}`;
      await handlePaymentMonetbilFailure(req, res, client, operatorMessage);
    }
    else if (req.body.message.toLowerCase() === 'expired') {
      const operatorMessage = `Désolé, votre transaction a expiré car le paiement n'a pas été validé dans les délais impartis. Cela peut être dû à une connexion lente ou à un retard dans la validation. Veuillez réessayer à nouveau pour compléter votre achat.\n\nSi vous avez besoin d'assistance,conctater le numéro 697874621 .\n\nMerci de votre compréhension, L'équipe bigwin.${NAVIGATION_SUFFIX}`;
      await handlePaymentMonetbilFailure(req, res, client, operatorMessage);
    }
    else if (req.body.message.toLowerCase() === 'successfull' || req.body.message.toLowerCase() === 'successful') {
      await handlePaymentMonetbilSuccess(req, res, client);
    }
    else {
      await handlePaymentMonetbilFailure(req, res, client);
    }
  } catch (error) {
    await logService.addLog(
      `${error.message}`,
      'handlePaymentMonetbilNotification',
      'error'
    );
    return ResponseService.internalServerError(res, { error: 'Erreur lors du traitement' });
  }
}

async function isVip(req, res) {
  const { phoneNumber } = req.params;
  try {
    const vipResult = await SubscriptionService.verifyUserVip(phoneNumber);
    return ResponseService.success(res, vipResult);
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



const listSub = async (req, res) => {
  const { limit, offset } = req.query;
  const response = await SubscriptionService.listSub(limit, offset);
  if (response.success) {
    return ResponseService.success(res, { subscriptions: response.subscription, total: response.total });
  } else {
    return ResponseService.internalServerError(res, { error: response.message });
  }
};

module.exports = {
  isVip,
  listSubscriptions,
  handlePaymentMonetbilNotification,
  listSub
};