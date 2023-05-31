module.exports = {
	apps: [
		{
			script: "node index.js",
			watch: ".",
		},
		{
			script: "./service-worker/",
			watch: ["./service-worker"],
		},
	],

	deploy: {
		production: {
			key: "donation-form-ec2.pem",
			user: "ubuntu",
			host: "18.202.244.58",
			ref: "origin/main",
			repo: "git@github.com:brandeddavid/redcross-donation-form-api.git",
			path: "/home/ubuntu/api/",
			"pre-deploy-local": "",
			"post-deploy":
				"source ~/.nvm/nvm.sh && npm install && pm2 reload ecosystem.config.js --env production",
			"pre-setup": "",
			"ssh-options": "ForwardAgent=yes",
		},
	},
};
