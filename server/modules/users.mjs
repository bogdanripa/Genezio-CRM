import { Users } from "../db.mjs";

export async function getAllUsers(userInfo) {
    const address = userInfo.address;
    const users = await Users.find({address}).lean();
    if (users) {
        users.forEach((user) => {
        user.id = user.userId;
        delete user.userId;
        });
    }
    if (!users) users = [];

    return users;
}