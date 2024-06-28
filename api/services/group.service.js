const Group = require('../models/group.model');
const User = require('../models/user.model');
const { generateAndDownloadCSV } = require('./generateCsv.service');
const {defaultGroups} = require("../data/defaultGroups");
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


module.exports = {
  createGroup,
  updateGroup, 
  deleteGroup,
  listGroups,
  getUsersInGroup,
  download,
  ensureDefaultGroupsExist,
  addUserToGroupByPhoneNumber
};
