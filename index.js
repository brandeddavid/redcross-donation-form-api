import express from "express";
import mysql from "mysql";
import cors from "cors";
import "dotenv/config";
import bodyParser from "body-parser";
import { DateTime } from "luxon";

const app = express();
const port = 8800;
const date = DateTime.now();

app.use(express.json());
app.use(bodyParser.json());

const corsOptions = {
	AccessControlAllowOrigin: "*",
	origin: ["http:localhost:8800", "http://52.68.51.77:8800"],
	methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
	allowedHeaders: [
		"Accept-Version",
		"Authorization",
		"Credentials",
		"Content-Type",
	],
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
	const query = "SELECT * FROM campaigns WHERE status = 1";

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
			pledgeFrequency,
			email,
			processingFee,
		},
	} = req;

	console.log({
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
		pledgeFrequency,
		email,
		processingFee,
	});
	const reminderDate =
		paymentMethod === 2 && pledgeFrequency === "monthly"
			? date.plus({ month: 1 })
			: 0;
	const donorQuery = `INSERT INTO donors (
		first_name,
		last_name,
		email,
		company_name,
		phone_no,
		physical_address,
		county,
		country,
		campaign_id,
		donor_type_id,
		created_at
		) 
		values (
			"${firstName}", 
			"${lastName}", 
			"${email}", 
			"${companyName}", 
			"${phoneNumber}", 
			"${address}", 
			"${county}", 
			"${country}", 
			"${campaignId}",
			"${donorType}",
			"${date}")`;

	const query = `INSERT INTO transactions (
		donor_id,
		currency_id,
		amount,
		payment_method_id,
		payment_reference,
		gateway,
		campaign_id,
		payment_date,
		status,
		updated_at
		) 
		values (
			"${donorType}",
			"${currency}", 
			"${amount}", 
			"${paymentMethod}", 
			"",
			"",
			"${campaignId}",
			"${date}",
			"0",
			"${date}")`;

	pool.getConnection((error, connection) => {
		if (error) throw error;

		connection.query(donorQuery, (error, data) => {
			if (error) {
				return res.json(error);
			}

			// return res.json({ donorId: data.insertId });
		});

		connection.query(query, (error, data) => {
			if (error) {
				return res.json(error);
			}

			const donationId = data.insertId;

			const commissionQuery = `INSERT INTO commissions (
				donor,
				campaign,
				donationAmount,
				commission,
				paymentMethod,
				status,
				donationId,
				createdOn
				) 
				values (
					"${firstName} ${lastName}", 
					"${campaignId}",
					"${amount}", 
					"${processingFee}", 
					"${paymentMethod}", 
					"0",
					"${donationId}",
					"${date}")`;

			processingFee &&
				connection.query(commissionQuery, (error, data) => {
					if (error) {
						return res.json(error);
					}
				});

			return res.json({ donationId });
		});

		connection.release();
	});
});

app.post("/api/process-payment", (req, res) => {
	const {
		body: {
			reference_id,
			bill_reference_id,
			amount,
			trace_id,
			gateway,
			transaction_trace_id,
			message,
			transaction_reference_id,
			status,
		},
	} = req;
	const payment_reference = trace_id || transaction_trace_id;
	const donation_id = Number(reference_id || transaction_reference_id);
	const gateway_payment_method = gateway || "Failed";

	const getUpdateDonationQuery = (status) => {
		if (status) {
			return `UPDATE donation SET 
		krc_reference = "${bill_reference_id}",
		payment_body = "${message}",
		amount = "${amount}",
		payment_reference="${payment_reference}",
		gateway_payment_method = "${gateway_payment_method}",
		payment_date = "${date}",
		updated_at = "${date}",
		payment_status ="1"
		WHERE donation_id="${donation_id}"
	`;
		}
		return `UPDATE donation SET 
		krc_reference = "${bill_reference_id}",
		payment_body = "${message}",
		amount = "${amount}",
		payment_reference="${payment_reference}",
		gateway_payment_method = "${gateway_payment_method}",
		payment_date = "${date}",
		updated_at = "${date}",
		payment_status = "-1"
		WHERE donation_id="${donation_id}"
	`;
	};

	const getUpdateCommissionsQuery = (status) => {
		if (status) {
			return `UPDATE commissions SET 
		status ="1"
		WHERE donationId="${donation_id}"
	`;
		}
		return `UPDATE commissions SET 
		payment_status = "-1"
		WHERE donationId="${donation_id}"
	`;
	};

	const updateDonationQuery = getUpdateDonationQuery(status);
	const updateCommissionsQuery = getUpdateCommissionsQuery(status);

	pool.getConnection((error, connection) => {
		if (error) throw error;

		connection.query(updateDonationQuery, (error, data) => {
			if (error) {
				return res.json(error);
			}

			return res.json(data);
		});

		connection.query(updateCommissionsQuery, (error, data) => {
			if (error) {
				return res.json(error);
			}
		});

		connection.release();
	});
});

app.get("/api/get-donation", (req, res) => {
	const query = `SELECT * FROM donation WHERE donation_id = ${req.query.donationId}`;

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

app.get("/api/countries", (req, res) => {
	const query = "SELECT * FROM country";

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

app.get("/api/counties", (req, res) => {
	const query = "SELECT * FROM counties";

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

app.listen(port, () => {
	console.log("Connected to the server on port:", port);
});
