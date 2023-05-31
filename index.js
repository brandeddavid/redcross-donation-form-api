import express from "express";
import mysql from "mysql";
import cors from "cors";
import "dotenv/config";
import bodyParser from "body-parser";

const app = express();
const port = 8800;

app.use(express.json());
app.use(bodyParser.json());

const corsOptions = {
	AccessControlAllowOrigin: "*",
	origin: "*",
	methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
};
app.use(cors(corsOptions));

const pool = mysql.createPool({
	host: process.env.DB_HOST,
	user: process.env.DB_USER,
	password: process.env.DB_USER_PASSWORD,
	database: process.env.DB_NAME,
	port: process.env.DB_PORT || 3306,
});

app.get("/", (req, res) => {
	res.send({
		status: 200,
		message: "Welcome to Redcross Donation Form API!",
	});
});

app.get("/api/campaigns", (req, res) => {
	const query = "SELECT * FROM donation_type WHERE status = 1";

	pool.getConnection((error, connection) => {
		if (error) throw error;

		connection.query(query, (error, data) => {
			if (error) {
				return res.json(error);
			}

			return res.json(data);
		});

		connection.release();
	});
});

app.post("/api/recommended", (req, res) => {
	const {
		body: { currency, donorType, campaignId },
	} = req;
	const query = `SELECT * FROM campaigndetail WHERE CampaignId = ${campaignId} and DonorType = ${donorType} and CurrencyType = ${currency}`;

	pool.getConnection((error, connection) => {
		if (error) throw error;

		connection.query(query, (error, data) => {
			if (error) {
				return res.json(error);
			}

			return res.json(data);
		});

		connection.release();
	});
});

app.post("/api/donate", (req, res) => {
	const {
		body: {
			currency,
			donorType,
			campaignId,
			firstName,
			lastName,
			companyName,
			phoneNumber,
			address,
			county,
			country,
			amount,
			paymentMethod,
		},
	} = req;
	const query = `INSERT INTO donation (krc_reference, donor_type, first_name, last_name, company_name, phone, address, region, country, currency, amount, payment_method, donation_cause, payment_body, payment_reference, gateway_payment_method, updated_at) values ("test", "${donorType}", "${firstName}", "${lastName}", "${companyName}", "${phoneNumber}", "${address}", "${county}", "${country}", "${currency}", "${amount}", "${paymentMethod}", "${campaignId}", "test", "test","test", "2022-04-22")`;

	pool.getConnection((error, connection) => {
		if (error) throw error;

		connection.query(query, (error, data) => {
			if (error) {
				return res.json(error);
			}

			return res.json({ donationId: data.insertId });
		});

		connection.release();
	});
});

app.listen(port, () => {
	console.log("Connected to the server on port:", port);
});
