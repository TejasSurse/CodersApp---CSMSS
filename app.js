const express = require("express");
const app = express();
const mysql = require("mysql2");
const path = require("path");
const methodOverride = require('method-override')
const ejsMate = require("ejs-mate");
const { createConnection } = require("net");


if(process.env.NODE_ENV != "production"){
    require("dotenv").config();
}
// EJS Setup
app.set("view engine", "ejs");
app.set("Views", path.join(__dirname, "/Views"));

app.use(methodOverride("_method"));
// Handeling body data 
app.use(express.urlencoded({extended: true}));
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname, "/public")));

app.listen(8080, ()=>{
    console.log("Server listening");
});

const conn = mysql.createConnection({
    host: 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
    user: '3M9H5Y1nTcJAw2z.root',
    password: 'deKDJXW47O7wjxhS',
    database: 'CSMSS',
    ssl: {
        rejectUnauthorized: false // Use `false` if you're okay with self-signed certificates
    }
});

app.get("/", (req, res)=>{
    res.render("login.ejs");
});
const axios = require('axios');



app.post("/getuser", async (req, res) => {
    const { rollno } = req.body;
    const sqlQuery = "SELECT leetcodeuname, gfguname FROM Student WHERE rollno = ?";

    // Fetching LeetCode and GFG usernames from the database
    conn.query(sqlQuery, [rollno], async (err, result) => {
        if (err) {
            console.error("Error executing query: " + err);
            return res.status(500).send("Database error.");
        } else if (result.length === 0) {
            return res.status(404).send("User not found.");
        }

        const leetcodeUsername = result[0].leetcodeuname;
        const gfgUsername = result[0].gfguname;

        try {
            // Fetching LeetCode data
            const leetcodeResponse = await axios.get(`https://leetcodeapi-v1.vercel.app/${leetcodeUsername}`);
            const leetcodeData = leetcodeResponse.data[leetcodeUsername];
            const leetcodeStats = {
                username: leetcodeUsername,
                totalSolved: leetcodeData.submitStatsGlobal.acSubmissionNum.find(d => d.difficulty === "All").count,
                easySolved: leetcodeData.submitStatsGlobal.acSubmissionNum.find(d => d.difficulty === "Easy").count,
                mediumSolved: leetcodeData.submitStatsGlobal.acSubmissionNum.find(d => d.difficulty === "Medium").count,
                hardSolved: leetcodeData.submitStatsGlobal.acSubmissionNum.find(d => d.difficulty === "Hard").count
            };

            // Fetching GFG data
            const gfgResponse = await axios.get(`https://geeks-for-geeks-api.vercel.app/${gfgUsername}`);
            const gfgData = gfgResponse.data;
            const gfgStats = {
                username: gfgData.info.userName,
                totalProblemsSolved: gfgData.info.totalProblemsSolved,
                schoolLevelSolved: gfgData.solvedStats.school.count,
                basicLevelSolved: gfgData.solvedStats.basic.count,
                easyLevelSolved: gfgData.solvedStats.easy.count,
                mediumLevelSolved: gfgData.solvedStats.medium.count,
                hardLevelSolved: gfgData.solvedStats.hard.count
            };

            // Combine LeetCode and GFG data into one object
            const combinedData = {
                leetcode: leetcodeStats,
                gfg: gfgStats
            };

            // Log combined data (for debugging)
            console.log(combinedData);

            // Send the combined data as a response
            res.render("profile.ejs", combinedData);
        } catch (error) {
            console.error("Error fetching data from the APIs: ", error);
            res.status(500).send("Error fetching data from the APIs.");
        }
    });
});


app.get("/register", (req, res)=>{
    res.render("register.ejs");
}); 

app.post("/register", (req, res) => {
    const { rollNo, leetcodeUsername, gfgUsername } = req.body;

    // Log the input data
    console.log('Inserting data:', { rollNo, leetcodeUsername, gfgUsername });

    // SQL query to insert the data
    const sql = 'INSERT INTO Student (rollno, leetcodeuname, gfguname) VALUES (?, ?, ?)';
    conn.query(sql, [rollNo, leetcodeUsername, gfgUsername], (err, result) => {
        if (err) {
            // Improved error logging
            console.error('Error inserting data:', err.code, err.message);
            return res.status(500).send('Error inserting data into the database.');
        }
        console.log('Data inserted successfully:', rollNo, leetcodeUsername, gfgUsername);
        res.redirect('/'); // Redirect to the login page
    });
});
