const { default: mongoose } = require("mongoose");
const Chat = require("../models/chatModel");
const { moreThanTwoMembers } = require("../utils/validateGroupMembers");

const createChat = async (req, res) => {
  const { members, name, isGroup } = req.body;
  let uniqueMembers;
  try {
    uniqueMembers = moreThanTwoMembers(req, members);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
  try {
    let chat;
    if (isGroup) {
      if (!name)
        return res.status(400).json({ error: "You must add a group name" });
      chat = await Chat.create({
        members: [...uniqueMembers],
        isGroup,
        groupAdmin: req.user._id,
        name,
      });
      chat = await chat.populate({
        path: "members",
        select: "firstName lastName profilePicture _id",
        match: { _id: { $ne: req.user._id } },
      });
      return res.status(201).json(chat);
    }
    const chatExists = await Chat.findOne({ members: [...uniqueMembers] });
    if (chatExists)
      return res.status(400).json({ error: "This chat is already created" });
    chat = await Chat.create({ members: [...uniqueMembers] });
    chat = await chat.populate({
      path: "members",
      select: "firstName lastName profilePicture _id",
      match: { _id: { $ne: req.user._id } },
    });
    res.status(201).json(chat);
  } catch (error) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const deleteChat = async (req, res) => {
  const { chatId } = req.params;
  try {
    const deletedChat = await Chat.findByIdAndDelete(chatId);
    if (!deletedChat) return res.status(400).json({ error: "no such chat" });
    res.status(200).json(deletedChat);
  } catch (error) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const getChats = async (req, res) => {
  try {
    const chats = await Chat.find({
      members: { $in: [req.user._id] },
    })
      .sort({ updatedAt: -1 })
      .populate({
        path: "members",
        select: "firstName lastName profilePicture _id about email",
        match: { _id: { $ne: req.user._id } },
      });

    res.status(200).json(chats);
  } catch (error) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const updateGroup = async (req, res) => {
  const { chatId } = req.params;
  const { members, name, groupPicture } = req.body;
  let uniqueMembers;
  try {
    uniqueMembers = moreThanTwoMembers(req, members);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
  try {
    const chat = await Chat.findById(chatId);
    if (!chat.isGroup)
      return res.status(400).json({
        error: "this chat is not a group chat, you can delete the whole chat",
      });
    if (!name)
      return res.status(400).json({ error: "You must add a group name" });
    if (chat.groupAdmin != req.user._id)
      return res
        .status(401)
        .json({ error: "you don't have the access the add or delete members" });
    const newChat = await Chat.findByIdAndUpdate(
      chatId,
      { members: [...uniqueMembers], name, groupPicture },
      { new: true }
    ).populate({
      path: "members",
      select: "firstName lastName profilePicture _id",
      match: { _id: { $ne: req.user._id } },
    });
    res.status(200).json(newChat);
  } catch (error) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

module.exports = { createChat, deleteChat, getChats, updateGroup };
