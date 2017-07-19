

const debug = require("debug")("emulator:datastore");
const fine = require("debug")("emulator:datastore");
const assert = require("assert")

// Extra imports 
const uuid = require('uuid/v4');
const base64 = require('base-64');


//
// People
//

function PersonStorage(datastore) {
    this.datastore = datastore;
    this.people = {};
}

// Initialize the store with a list of prepared accounts
PersonStorage.prototype.init = function (accounts) {
    var self = this;
    accounts.forEach(function (elem) {
        self.people[elem.id] = elem;
    });
}

PersonStorage.prototype.find = function (personId, cb) {

    assert(personId);

    const person = this.people[personId];
    if (!person) {
        debug(`could not find Person with id: ${personId}`);
        if (cb) {
            var err = new Error(`could not find Person with id: ${personId}`);
            err.code = "PERSON_NOT_FOUND";
            cb(err, null);
            return;
        }
    }

    cb(null, person);
}


//
// Rooms
//

function RoomStorage(datastore) {
    this.datastore = datastore;
    this.rooms = {};
}

RoomStorage.prototype.create = function (person, title, type) {

    assert.ok(person);
    assert.ok(title);
    assert.ok(type);

    // Create room
    const now = new Date(Date.now()).toISOString();
    var room = {
        "id": base64.encode("ciscospark://em/ROOM/" + uuid()),
        "title": title,
        "type": type,
        "isLocked": false,
        "lastActivity": now,
        "creatorId": person.id,
        "created": now
    }

    // Store room
    this.rooms[room.id] = room;

    // Add creator to rom members
    this.datastore.memberships._add(person.id, room.id, person);

    return room;
}


RoomStorage.prototype.list = function (person) {

    assert.ok(person);

    // Retreive the memberships of the user
    // [TODO]  

    // Filter out the rooms the 
    var self = this;
    const list = Object.keys(this.rooms).map(function (key, index) {
        return self.rooms[key];
    }).sort(function (a, b) {
        return (a.lastActivity < b.lastActivity);
    });

    return list;
}


RoomStorage.prototype.find = function (person, roomId) {

    assert.ok(roomId);

    // [PENDING]
    //this.datastore.memberships.list

    var self = this;
    const list = Object.keys(this.rooms).map(function (key, index) {
        return self.rooms[key];
    }).sort(function (a, b) {
        return (a.lastActivity < b.lastActivity);
    });

    return list;
}


//
// Memberships
//

function MembershipStorage(datastore) {
    this.datastore = datastore;
    this.memberships = {};
}

MembershipStorage.prototype.create = function (actor, roomId, newMemberId, isModerator, cb) {

    assert.ok(actor);
    assert.ok(roomId);
    assert.ok(newMemberId);
    // Moderation not supported
    assert.ok(isModerator == false);

    // Check actor is a member of the room and that the person is not already a member
    // 1. List Room Membership
    // 2. Check actor
    // 3. Check person

    const self = this;
    var foundActor = false;
    var foundNewMember = false;
    Object.keys(this.memberships).map(function (key, index) {
        var elem = self.memberships[key];
        if (elem.roomId == roomId) {
            if (elem.personId == actor.id) {
                fine(`createMEmbership: found actor in room: ${roomId}`);
                foundActor = true;
            }
            if (elem.personId == newMemberId) {
                fine(`createMEmbership: found new member in room: ${roomId}`);
                foundNewMember = true;
            }
            return elem;
        }
    });

    if (!foundActor) {
        debug("cannot create membership in a room the actor is not part of");
        if (cb) {
            var err = new Error("cannot create membership in a room the actor is not part of");
            err.code = "NOT_A_MEMBER";
            cb(err, null);
        }
        return;
    }

    if (foundNewMember) {
        debug("participant is already a member of the room");
        if (cb) {
            var err = new Error("participant is already a member of the room");
            err.code = "ALREADY_A_MEMBER";
            cb(err, null);
        }
        return;
    }

    // Retreive detailed person info
    this.datastore.people.find(newMemberId, function (err, person) {
        if (err) {
            debug(`details not found for person: ${newMemberId}`);
            if (cb) {
                var err2 = new Error("details not found for specified person");
                err2.code = "PERSON_NOT_FOUND";
                cb(err2, null);
            }
            return;
        }

        // Create membership
        var membership = self.datastore.memberships._add(actor.id, roomId, person);

        // Invoke callback
        if (cb) {
            cb(null, membership);
        }
    });
}


MembershipStorage.prototype._add = function (actorId, roomId, newMember) {

    assert.ok(actorId);
    assert.ok(roomId);
    assert.ok(newMember);

    // Create membership
    const now = new Date(Date.now()).toISOString();
    var membership = {
        "id": base64.encode("ciscospark://em/MEMBERSHIP/" + uuid()),
        "roomId": roomId,
        "personId": newMember.id,
        "personEmail": newMember.emails[0],
        "personDisplayName": newMember.displayName,
        "personOrgId": newMember.orgId,
        "isModerator": false,
        "isMonitor": false,
        "created": new Date(Date.now()).toISOString()
    }

    // Store membership
    this.memberships[membership.id] = membership;

    // Fire event
    // [TODO]

    return membership;
}


MembershipStorage.prototype.list = function (actor, cb) {

    assert.ok(actor);

    var self = this;
    const list = Object.keys(this.memberships).map(function (key, index) {
        var elem = self.memberships[key];
        if (actor.id == elem.personId) {
            return elem;
        }
    }).sort(function (a, b) {
        return (a.roomId > b.roomId);
    });


    if (cb) {
        cb(null, list);
    }
}

MembershipStorage.prototype.list = function (actor, cb) {

    assert.ok(actor);

    var list = [];
    var self = this;
    Object.keys(this.memberships).forEach(function (elem) {
        var membership = self.memberships[elem];
        if (actor.id == membership.personId) {
            list.push(membership);
        }
    });

    if (cb) {
        cb(null, list);
    }
}


MembershipStorage.prototype.find = function (actor, membershipId, cb) {

    assert.ok(actor);
    assert.ok(membershipId);

    // Check membership exists
    const membership = this.memberships[membershipId];
    if (!membership) {
        debug(`membership does not exists with id: ${membershipId}`);
        if (cb) {
            var err = new Error(`membership does not exists with id: ${membershipId}`);
            err.code = "MEMBERSHIP_NOT_FOUND";
            cb(err, null);
        }
        return;
    }

    // Check the user is part of the room
    var self = this;
    var found = false;
    Object.keys(this.memberships).forEach(function (key) {
        var elem = self.memberships[key];
        if (membership.roomId == elem.roomId) {
            if (actor.id == elem.personId) {
                found = true;
            }
        }
    });
    if (found) {
        if (cb) {
            cb(null, membership);
        }
        return;
    }

    var err = new Error(`membership found but the user: ${actor.id} is not part of room: ${membership.roomId}`);
    err.code = "NOT_MEMBER_OF_ROOM";
    if (cb) {
        cb(err, null);
    }
}



// 
// Init store
//
var datastore = {};
datastore.rooms = new RoomStorage(datastore);
datastore.memberships = new MembershipStorage(datastore);
datastore.people = new PersonStorage(datastore);

module.exports = datastore;
