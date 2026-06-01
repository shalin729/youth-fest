const mongoose = require("mongoose");

async function check() {
  await mongoose.connect("mongodb://shalinbhanat29_db_user:IZlJWR85pdmu3D2A@ac-orxln1v-shard-00-00.jgkij9h.mongodb.net:27017,ac-orxln1v-shard-00-01.jgkij9h.mongodb.net:27017,ac-orxln1v-shard-00-02.jgkij9h.mongodb.net:27017/YouthFest?ssl=true&authSource=admin&replicaSet=atlas-8lvadc-shard-0&retryWrites=true&w=majority");

  const regs = await mongoose.connection.db.collection("registrations").find({}).sort({createdAt: -1}).limit(3).toArray();
  console.log("LATEST 3 REGISTRATIONS:");
  console.log(JSON.stringify(regs, null, 2));

  process.exit(0);
}

check().catch(console.error);
