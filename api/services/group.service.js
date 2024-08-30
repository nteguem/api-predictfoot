const Group = require('../models/group.model');
const User = require('../models/user.model');
const Subscription = require("../models/subscription.model");
const Plan = require("../models/plan.model");
const { generateAndDownloadCSV } = require('./generateCsv.service');
const {defaultGroups} = require("../data/defaultGroups");
const { verifyUserVip } = require("../services/subscription.service");
const logger = require("../helpers/logger")

async function createGroup(groupData,client) {
  try {
    const newGroup = new Group(groupData);
    await newGroup.save();
    return { success: true, message: 'Groupe créé avec succès' };
  } catch (error) {
    logger(client).error('Error create group:', error);
    return { success: false, error: error.message };
  }
}

async function updateGroup(groupId, updatedData,client) {
  try {
    const group = await Group.findByIdAndUpdate(groupId, updatedData, { new: true });
    if (!group) {
      return { success: false, error: 'Groupe non trouvé' };
    }
    return { success: true, message: 'Groupe mis à jour avec succès', group };
  } catch (error) {
    logger(client).error('Error update group:', error);
    return { success: false, error: error.message };
  }
}

async function deleteGroup(groupId,client) {
  try {
    const group = await Group.findByIdAndDelete(groupId);
    if (!group) {
      return { success: false, error: 'Groupe non trouvé' };
    }
    return { success: true, message: 'Groupe supprimé avec succès' };
  } catch (error) {
    logger(client).error('Error delete group:', error);
    return { success: false, error: error.message };
  }
}

async function listGroups(client) {
  try {
    const groups = await Group.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "members",
          foreignField: "_id",
          as: "members"
        }
      },
      {
        $project: {
          name: 1,
          description: 1,
          memberCount: { $size: "$members" } 
        }
      }
    ]);

    return { success: true, groups };
  } catch (error) {
    logger(client).error('Error list group:', error);
    return { success: false, error: error.message };
  }
}



async function getUsersInGroup(groupId) {
  try {
    const group = await Group.findById(groupId).populate('members');
    if (!group) {
      return { success: false, error: 'Groupe non trouvé' };
    }
    const groupName = group.name;
    const users = group.members;
    return { success: true, users, groupName };
  } catch (error) {
    return { success: false, error: error.message };
  }
}


async function download(idGroup) {
  try {
    const result = await getUsersInGroup(idGroup);

    const formattedUsers = result.users.map(user => {
      const { _id, password, createdAt, updatedAt, __v, ...rest } = user._doc;
      return rest;
    });
    return generateAndDownloadCSV(formattedUsers, result.groupName)
  } catch (error) {
    console.log('Error generating CSV file', error)
  }
}

async function addUserToGroupByPhoneNumber(groupName, phoneNumber) {
  try {
    // Recherche de l'utilisateur par numéro de téléphone
    const user = await User.findOne({ phoneNumber: phoneNumber });
    if (!user) {
      return { success: false, error: 'Utilisateur non trouvé' };
    }
    // Recherche du groupe par son nom
    const group = await Group.findOne({ name: groupName });
    if (!group) {
      return { success: false, error: 'Groupe non trouvé' };
    }

    // Vérifie si l'utilisateur est déjà membre du groupe
    const isMember = group.members.includes(user._id);
    if (isMember) {
      return { success: false, error: 'L\'utilisateur est déjà membre du groupe' };
    }

    // Ajoute l'utilisateur à la liste des membres du groupe
    group.members.push(user._id);
    await group.save();

    return { success: true, message: 'Utilisateur ajouté au groupe avec succès' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}


async function ensureDefaultGroupsExist() {
  try {
    for (const defaultGroup of defaultGroups) {
      const groupExists = await Group.findOne({ name: defaultGroup.name });
      if (!groupExists) { 
        await createGroup(defaultGroup);
        console.log(`Default group ${defaultGroup.name} created.`);
      }
    }
  } catch (error) {
    console.log('Error ensuring default groups exist:', error.message);
  }
}


async function generateAvailableGroups(client) {
  try {
    const groups = new Map();
    const currentDate = new Date();

    // 1. Tous les Utilisateurs
    const allUsersCount = await User.countDocuments();
    if (allUsersCount > 0) {
      groups.set("all_users", { name: "Tous les utilisateurs", reference: "all_users", count: allUsersCount });
    }

    // 2. Récupérer tous les abonnements
    const subscriptions = await Subscription.find().populate('plan').populate('user');
    // Comptes pour chaque groupe
    let activeSubscriptionsCount = 0;
    let expiredSubscriptionsCount = 0;
    let noSubscriptionCount = 0;
    let expiringSoonCount = 0;

    const planGroups = {};

    // Créer un ensemble des utilisateurs avec des abonnements actifs
    const activeUserIds = new Set();

    // Vérifier chaque abonnement
    subscriptions.forEach(subscription => {
      const { startDate, endDate, plan, user } = subscription;

      // 3. Utilisateurs avec Abonnement Actif
      if (new Date(startDate) <= currentDate && currentDate <= new Date(endDate)) {
        activeSubscriptionsCount++;
        activeUserIds.add(user._id.toString()); // Ajoutez l'utilisateur au set des abonnements actifs

        // 4. Utilisateurs avec Abonnement Actif au Plan Spécifique
        if (plan && plan.name) {
          const planGroupName = `plan_${plan.name.toLowerCase().replace(/\s+/g, '_')}_active`;
          if (!planGroups[planGroupName]) {
            planGroups[planGroupName] = { name: `Utilisateurs avec le plan: ${plan.name}`, reference: planGroupName, count: 0 };
          }
          planGroups[planGroupName].count++;
        }
      }

      // 8. Utilisateurs avec Abonnement Expirant sous peu (dans les 4 jours ou moins)
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() + 4);
      if (new Date(endDate) <= thresholdDate && new Date(endDate) >= currentDate) {
        expiringSoonCount++;
      }

      // 5. Utilisateurs avec Abonnement Expiré
      if (currentDate > new Date(endDate)) {
        if (!activeUserIds.has(user._id.toString())) { // Vérifiez si l'utilisateur n'a pas d'abonnement actif
          expiredSubscriptionsCount++;

          // 6. Utilisateurs avec Abonnement Expiré au Plan Spécifique
          if (plan && plan.name) {
            const expiredPlanGroupName = `plan_${plan.name.toLowerCase().replace(/\s+/g, '_')}_expired`;
            if (!planGroups[expiredPlanGroupName]) {
              planGroups[expiredPlanGroupName] = { name: `Utilisateurs avec le plan expiré: ${plan.name}`, reference: expiredPlanGroupName, count: 0 };
            }
            planGroups[expiredPlanGroupName].count++;
          }
        }
      }
    });

    // Ajouter les groupes comptés (seulement si count > 0)
    if (activeSubscriptionsCount > 0) {
      groups.set("active_subscriptions", { name: "Utilisateurs avec abonnement actif", reference: "active_subscriptions", count: activeSubscriptionsCount });
    }
    if (expiredSubscriptionsCount > 0) {
      groups.set("expired_subscriptions", { name: "Utilisateurs avec abonnement expiré", reference: "expired_subscriptions", count: expiredSubscriptionsCount });
    }

    // Ajouter les groupes spécifiques aux plans
    Object.values(planGroups).forEach(group => {
      if (group.count > 0) {
        groups.set(group.reference, group);
      }
    });

    // 7. Utilisateurs Sans Abonnement
    const allUsers = await User.find();
    const usersWithSubscriptions = subscriptions.map(sub => sub.user._id.toString());
    const usersWithoutSubscriptions = allUsers.filter(user => !usersWithSubscriptions.includes(user._id.toString()));
    noSubscriptionCount = usersWithoutSubscriptions.length;
    if (noSubscriptionCount > 0) {
      groups.set("no_subscription", { name: "Utilisateurs sans abonnement", reference: "no_subscription", count: noSubscriptionCount });
    }

    if (expiringSoonCount > 0) {
      groups.set("expiring_soon", {
        name: "Utilisateurs avec abonnement expirant dans 4 jours ou moins",
        reference: "expiring_soon",
        count: expiringSoonCount,
      });
    }

    return { success: true, groups: Array.from(groups.values()) };
  } catch (error) {
    logger(client).error('Error generating available groups:', error);
    return { success: false, error: error.message };
  }
}



async function getUsersByGroupReference(reference) {
  try {
    const currentDate = new Date();

    if (reference === "all_users") {
      // Récupérer tous les utilisateurs
      const users = await User.find();
      return { success: true, users };

    } else if (reference === "active_subscriptions") {
      // Récupérer les utilisateurs avec un abonnement actif
      const subscriptions = await Subscription.find({
        startDate: { $lte: currentDate },
        endDate: { $gte: currentDate }
      }).populate('user').populate('plan');

      const users = subscriptions.map(sub => ({
        user: sub.user,
        plan: sub.plan
      }));
      return { success: true, users };

    } else if (reference === "expired_subscriptions") {
      // Récupérer les utilisateurs avec un abonnement expiré
      const subscriptions = await Subscription.find({
        endDate: { $lt: currentDate }
      }).populate('user').populate('plan');

      const users = subscriptions.map(sub => ({
        user: sub.user,
        plan: sub.plan
      }));
      return { success: true, users };

    } else if (reference === "no_subscription") {
      // Récupérer les utilisateurs sans abonnement
      const allUsers = await User.find();
      const subscriptions = await Subscription.find().populate('user');
      const usersWithSubscriptions = subscriptions.map(sub => sub.user._id.toString());

      const usersWithoutSubscriptions = allUsers.filter(user => !usersWithSubscriptions.includes(user._id.toString()));
      return { success: true, users: usersWithoutSubscriptions };

    } else if (reference === "expiring_soon") {
      // Récupérer les utilisateurs avec un abonnement expirant dans les 4 jours
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() + 4);

      const subscriptions = await Subscription.find({
        endDate: { $lte: thresholdDate, $gte: currentDate }
      }).populate('user').populate('plan');

      const users = subscriptions.map(subscription => {
        const daysRemaining = Math.ceil((new Date(subscription.endDate) - currentDate) / (1000 * 60 * 60 * 24));
        return {
          ...subscription.user.toObject(),
          plan: subscription.plan,
          daysRemaining
        };
      });

      return { success: true, users };

    } else if (reference.startsWith("plan_")) {
      // Gérer les références spécifiques aux plans (ex: plan_premium_active, plan_premium_expired)
      const [_, ...planParts] = reference.split('_');
      const status = planParts.pop(); // La dernière partie est le statut (active/expired)
      const planName = planParts.join('_'); // Tout le reste compose le nom du plan
      const isActive = status === "active";

      const subscriptions = await Subscription.find().populate('user').populate('plan');
      
      const filteredSubscriptions = subscriptions.filter(sub => {
        const planNameInDB = sub.plan.name.toLowerCase().replace(/\s+/g, '_');
        const matchPlan = planNameInDB === planName;

        const matchStatus = isActive 
          ? (new Date(sub.startDate) <= currentDate && currentDate <= new Date(sub.endDate)) 
          : currentDate > new Date(sub.endDate);
        return matchPlan && matchStatus;
      });

      const users = filteredSubscriptions.map(sub => ({
        user: sub.user,
        plan: sub.plan
      }));
      return { success: true, users };

    } else {
      return { success: false, message: "Référence non prise en charge" };
    }
  } catch (error) {
    console.error('Error retrieving users by group reference:', error);
    return { success: false, error: error.message };
  }
}







module.exports = {
  createGroup,
  updateGroup, 
  deleteGroup,
  listGroups,
  getUsersInGroup,
  download,
  ensureDefaultGroupsExist,
  addUserToGroupByPhoneNumber,
  generateAvailableGroups,
  getUsersByGroupReference

};
