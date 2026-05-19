import jwt from "jsonwebtoken";
const token = jwt.sign({ userId: 1 }, "supersecret", { expiresIn: "30d" });

const reqBody = {
  age: 30,
  gender: "male",
  heightCm: 175,
  weightKg: 70,
  activityLevel: "moderately_active",
  dietPreference: "non_vegetarian",
  goal: "maintenance"
};

const res = await fetch("http://localhost:3000/profile", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  },
  body: JSON.stringify(reqBody)
});

console.log(res.status);
const text = await res.text();
console.log(text);
