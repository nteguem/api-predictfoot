const OrderStateManager = require('./orderState');
const OrderHandler = require('./orderHandler');
const { sendMessageToNumber, replyToMessage } = require('../../whatsApp/whatsappMessaging');
const logService = require('../../../services/log.service');

const orderStateManager = new OrderStateManager();
const orderHandler = new OrderHandler(orderStateManager);

const orderCommander = async (user, msg, client) => {
    try {
        const response = await orderHandler.handleMessage(msg, client, user);
        
        if (response) {
            switch (response.type) {
                case 'PROMPT':
                case 'ERROR':
                case 'COMPLETE':
                    await replyToMessage(client, msg, response.message);
                    break;
                case 'RESET':
                    await sendMessageToNumber(client, user.data.phoneNumber, response.message);
                    break;
            }
        }
    } catch (error) {
        await logService.addLog(
            `${error.message}`,
            'orderCommander',
            'error'
        );
        await replyToMessage(client, msg, "Une erreur est survenue. Tapez # pour recommencer.");
    }
};

const sendStepMessage = async (client, phoneNumber) => {
    try {
        if (!orderStateManager.getCurrentState(phoneNumber)) {
            orderStateManager.initializeOrder(phoneNumber);
        }
        const response = await orderHandler.getStepMessage(phoneNumber);
        if (response && response.message) {
            await sendMessageToNumber(client, phoneNumber, response.message);
        }
    } catch (error) {
        await logService.addLog(
            `${error.message}`,
            'sendStepMessage',
            'error'
        );
    }
};
 
module.exports = {
    orderCommander,
    sendStepMessage
};