const EventService = require('../services/event.service');
const ResponseService = require('../services/response.service');

async function createEvent(req, res, client) {
  const eventData = req.body;
  const response = await EventService.createEvent(eventData, client);
  if (response.success) {
    return ResponseService.created(res, { message: response.message, event: response.event });
  } else {
    return ResponseService.internalServerError(res, { error: response.error });
  }
}

async function updateEvent(req, res, client) {
  const eventId = req.query.id;
  const updatedData = req.body;
  const response = await EventService.updateEvent(eventId, updatedData, client);
  if (response.success) {
    return ResponseService.success(res, { message: response.message, event: response.event });
  } else {
    if (response.error === 'Événement non trouvé') {
      return ResponseService.notFound(res, { message: response.error });
    } else {
      return ResponseService.internalServerError(res, { error: response.error });
    }
  }
}

async function deleteEvent(req, res, client) {
  const eventId = req.query.id;
  const response = await EventService.deleteEvent(eventId, client);
  if (response.success) {
    return ResponseService.success(res, { message: response.message });
  } else {
    if (response.error === 'Événement non trouvé') {
      return ResponseService.notFound(res, { message: response.error });
    } else {
      return ResponseService.internalServerError(res, { error: response.error });
    }
  }
}

async function listEvents(req, res, client) {
  const response = await EventService.listEvents(client);
  if (response.success) {
    return ResponseService.success(res, { events: response.events });
  } else {
    return ResponseService.internalServerError(res, { error: response.error });
  }
}

async function getEventById(req, res, client) {
  const eventId = req.query.id;
  const response = await EventService.getEventById(eventId, client);
  if (response.success) {
    return ResponseService.success(res, { event: response.event });
  } else {
    if (response.error === 'Événement non trouvé') {
      return ResponseService.notFound(res, { message: response.error });
    } else {
      return ResponseService.internalServerError(res, { error: response.error });
    }
  }
}

module.exports = {
  createEvent,
  updateEvent,
  deleteEvent,
  listEvents,
  getEventById
};
