# Deployment Instructions

This document explains how to deploy the backend server and ensure all dependencies are installed.

## Using the deployment script

A script `deploy.sh` is provided to automate the deployment process.

To deploy the server:

1. Make sure you have Node.js and npm installed on the deployment environment.
2. Upload the project files to the deployment server.
3. Run the deployment script:

```bash
chmod +x deploy.sh
./deploy.sh
```

This script will:

- Install all required dependencies using `npm install`.
- Start the server using `npm start`.

## Manual deployment steps

If you prefer to deploy manually, run the following commands in the project directory:

```bash
npm install
npm start
```

Make sure to run `npm install` whenever you update dependencies.

## Troubleshooting

- If you encounter errors related to missing modules, ensure `npm install` has been run successfully.
- Check that your environment has internet access to download packages.
- Verify that the `package.json` file lists all required dependencies.

For further assistance, please contact the project maintainer.
