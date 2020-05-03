const db = {
  screams: [
    {
      userHandle: "user",
      body: "this is scream body",
      createdAt: "2020-04-24T22:53:40.365Z",
      likeCount: 5,
      commentCount: 5,
    },
  ],
  users: [
    {
      userId: "bdygfygdywgfyrgywgfge",
      email: "user@user.com",
      createdAt: "2020-04-24T22:53:40.365Z",
      handle: "user",
      bio: "Hello, my name is name",
      website: "https://www.mywebsite.com",
      location: "New York, New York",
    },
  ],
  comments: [
    {
      userHandle: "user",
      screamId: "hxvsycgyfs7gvet",
      body: "sick scream dude",
      createdAt: "2020-04-24T22:53:40.365Z",
    },
  ],

  notifications: [
    {
      to: "user",
      from: "otheruser",
      read: true | false,
      createdAt: "2020-04-24T22:53:40.365Z",
      type: "like" | "comment",
      screamId: "hxvsycgyfs7gvet",
    },
  ],
};

const userDetails = {
  credentials: {
    userId: "bdygfygdywgfyrgywgfge",
    email: "user@user.com",
    createdAt: "2020-04-24T22:53:40.365Z",
    handle: "user",
    bio: "Hello, my name is name",
    website: "https://www.mywebsite.com",
    location: "New York, New York",
    imageUrl: "https://imageurl.com",
  },

  // show icon that we liked posts
  likes: [
    {
      userHandle: "user",
      screamId: "shfughuwudgcdufhje3n4beud",
    },
    {
      userHandle: "user",
      screamId: "dgrgtubj5thh",
    },
  ],
};
