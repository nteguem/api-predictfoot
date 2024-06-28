const Event = require('../models/event.model');
const logger = require('../helpers/logger');

async function createEvent(eventData, client) {
  try {
    const newEvent = new Event(eventData);
    await newEvent.save();
    return { success: true, message: 'Événement créé avec succès', event: newEvent };
  } catch (error) {
    logger(client).error('Error creating event:', error);
    return { success: false, error: error.message };
  }
}

async function updateEvent(eventId, updatedData, client) {
  try {
    const event = await Event.findByIdAndUpdate(eventId, updatedData, { new: true });
    if (!event) {
      return { success: false, error: 'Événement non trouvé' };
    }
    return { success: true, message: 'Événement mis à jour avec succès', event };
  } catch (error) {
    logger(client).error('Error updating event:', error);
    return { success: false, error: error.message };
  }
}

async function deleteEvent(eventId, client) {
  try {
    const event = await Event.findByIdAndDelete(eventId);
    if (!event) {
      return { success: false, error: 'Événement non trouvé' };
    }
    return { success: true, message: 'Événement supprimé avec succès' };
  } catch (error) {
    logger(client).error('Error deleting event:', error);
    return { success: false, error: error.message };
  }
}

async function listEvents(client) {
  try {
    const events = await Event.find({});
    return { success: true, events };
  } catch (error) {
    logger(client).error('Error listing events:', error);
    return { success: false, error: error.message };
  }
}

async function getEventById(eventId, client) {
  try {
    const event = await Event.findById(eventId);
    if (!event) {
      return { success: false, error: 'Événement non trouvé' };
    }
    return { success: true, event };
  } catch (error) {
    logger(client).error('Error fetching event:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  createEvent,
  updateEvent,
  deleteEvent,
  listEvents,
  getEventById
};
