"use server";

import { createScreen as createScreenImpl, updateScreen as updateScreenImpl, addNotice as addNoticeImpl, toggleNotice as toggleNoticeImpl, deleteNotice as deleteNoticeImpl, updateNotice as updateNoticeImpl, removeScreen as removeScreenImpl, moveScreen as moveScreenImpl, saveUpdate as saveUpdateImpl, deleteUpdate as deleteUpdateImpl } from "@/modules/admin/screens";

export async function createScreen(formData: FormData) {
  return createScreenImpl(formData);
}

export async function updateScreen(formData: FormData) {
  return updateScreenImpl(formData);
}

export async function addNotice(formData: FormData) {
  return addNoticeImpl(formData);
}

export async function toggleNotice(formData: FormData) {
  return toggleNoticeImpl(formData);
}

export async function deleteNotice(formData: FormData) {
  return deleteNoticeImpl(formData);
}

export async function updateNotice(formData: FormData) {
  return updateNoticeImpl(formData);
}

export async function removeScreen(formData: FormData) {
  return removeScreenImpl(formData);
}

export async function moveScreen(formData: FormData) {
  return moveScreenImpl(formData);
}

export async function saveUpdate(formData: FormData) {
  return saveUpdateImpl(formData);
}

export async function deleteUpdate(formData: FormData) {
  return deleteUpdateImpl(formData);
}

import { createGroup as createGroupImpl, setGroupLogo as setGroupLogoImpl, syncGroupLogos as syncGroupLogosImpl, setGroupPromo as setGroupPromoImpl, setGroupUser as setGroupUserImpl, removeGroupUser as removeGroupUserImpl, renameGroup as renameGroupImpl, deleteGroup as deleteGroupImpl, updateGroup as updateGroupImpl, addAddress as addAddressImpl, deleteAddress as deleteAddressImpl, moveAddress as moveAddressImpl, addGroupNotice as addGroupNoticeImpl, toggleGroupNotice as toggleGroupNoticeImpl, deleteGroupNotice as deleteGroupNoticeImpl, updateGroupNotice as updateGroupNoticeImpl, reorderGroupScreens as reorderGroupScreensImpl } from "@/modules/admin/groups";

export async function createGroup(formData: FormData) {
  return createGroupImpl(formData);
}

export async function setGroupLogo(formData: FormData) {
  return setGroupLogoImpl(formData);
}

export async function syncGroupLogos(groups: { id: number; logoUrl: string }[]) {
  return syncGroupLogosImpl(groups);
}

export async function setGroupPromo(formData: FormData) {
  return setGroupPromoImpl(formData);
}

export async function setGroupUser(formData: FormData) {
  return setGroupUserImpl(formData);
}

export async function removeGroupUser(formData: FormData) {
  return removeGroupUserImpl(formData);
}

export async function renameGroup(formData: FormData) {
  return renameGroupImpl(formData);
}

export async function deleteGroup(formData: FormData) {
  return deleteGroupImpl(formData);
}

export async function updateGroup(formData: FormData) {
  return updateGroupImpl(formData);
}

export async function addAddress(formData: FormData) {
  return addAddressImpl(formData);
}

export async function deleteAddress(formData: FormData) {
  return deleteAddressImpl(formData);
}

export async function moveAddress(formData: FormData) {
  return moveAddressImpl(formData);
}

export async function addGroupNotice(formData: FormData) {
  return addGroupNoticeImpl(formData);
}

export async function toggleGroupNotice(formData: FormData) {
  return toggleGroupNoticeImpl(formData);
}

export async function deleteGroupNotice(formData: FormData) {
  return deleteGroupNoticeImpl(formData);
}

export async function updateGroupNotice(formData: FormData) {
  return updateGroupNoticeImpl(formData);
}

export async function reorderGroupScreens(formData: FormData) {
  return reorderGroupScreensImpl(formData);
}

import { createListedScreen as createListedScreenImpl, deleteListedScreen as deleteListedScreenImpl, moveListedScreen as moveListedScreenImpl, deleteBuilding as deleteBuildingImpl, addFloor as addFloorImpl, addRoom as addRoomImpl, updateFloor as updateFloorImpl, updateRoom as updateRoomImpl, deleteRoom as deleteRoomImpl, setRoomLogo as setRoomLogoImpl, deleteFloor as deleteFloorImpl } from "@/modules/admin/buildings";

export async function createListedScreen(formData: FormData) {
  return createListedScreenImpl(formData);
}

export async function deleteListedScreen(formData: FormData) {
  return deleteListedScreenImpl(formData);
}

export async function moveListedScreen(formData: FormData) {
  return moveListedScreenImpl(formData);
}

export async function deleteBuilding(formData: FormData) {
  return deleteBuildingImpl(formData);
}

export async function addFloor(formData: FormData) {
  return addFloorImpl(formData);
}

export async function addRoom(formData: FormData) {
  return addRoomImpl(formData);
}

export async function updateFloor(formData: FormData) {
  return updateFloorImpl(formData);
}

export async function updateRoom(formData: FormData) {
  return updateRoomImpl(formData);
}

export async function deleteRoom(formData: FormData) {
  return deleteRoomImpl(formData);
}

export async function setRoomLogo(formData: FormData) {
  return setRoomLogoImpl(formData);
}

export async function deleteFloor(formData: FormData) {
  return deleteFloorImpl(formData);
}

import { addTicker as addTickerImpl, deleteTicker as deleteTickerImpl, setMusic as setMusicImpl, saveFeed as saveFeedImpl, deleteFeed as deleteFeedImpl } from "@/modules/admin/content";

export async function addTicker(formData: FormData) {
  return addTickerImpl(formData);
}

export async function deleteTicker(formData: FormData) {
  return deleteTickerImpl(formData);
}

export async function setMusic(formData: FormData) {
  return setMusicImpl(formData);
}

export async function saveFeed(formData: FormData) {
  return saveFeedImpl(formData);
}

export async function deleteFeed(formData: FormData) {
  return deleteFeedImpl(formData);
}
