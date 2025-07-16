const axios = require("axios");
const uuid = require("uuid");
const token = process.env.WISE_API_TOKEN;

const listProfiles = async () => {
    try {
        const url = `https://api.sandbox.transferwise.tech/v2/profiles`;
        const config = {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
        };

        const response = await axios.get(url, config);
        return response.data;
    } catch (error) {
        console.error(`Status ${error.response.status}`);
        console.error(`Trace ID: ${error.response.headers["x-trace-id"]}`);
        console.error(error.response.data);
        throw error;
    }
};

const createQuote = async (profileId) => {
    try {
        const url = `https://api.sandbox.transferwise.tech/v3/profiles/${profileId}/quotes`;
        const config = {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
        };
        const body = {
            sourceCurrency: "SGD",
            targetCurrency: "GBP",
            sourceAmount: 1000,
        };

        const response = await axios.post(url, body, config);
        return response.data;
    } catch (error) {
        console.error(`Status ${error.response.status}`);
        console.error(`Trace ID: ${error.response.headers["x-trace-id"]}`);
        console.error(error.response.data);
        throw error;
    }
};

const createRecipient = async () => {
    try {
        const url = `https://api.sandbox.transferwise.tech/v1/accounts`;
        const config = {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
        };
        const body = {
            accountHolderName: "GBP Person Name",
            currency: "GBP",
            type: "sort_code",
            details: {
                legalType: "PRIVATE",
                sortCode: "04-00-04",
                accountNumber: "12345678",
            },
        };

        const response = await axios.post(url, body, config);
        return response.data;
    } catch (error) {
        console.error(`Status ${error.response.status}`);
        console.error(`Trace ID: ${error.response.headers["x-trace-id"]}`);
        console.error(error.response.data);
        throw error;
    }
};

const createTransfer = async (quoteId, recipientId) => {
    try {
        const url = `https://api.sandbox.transferwise.tech/v1/transfers`;
        const config = {
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`,
            },
        };
        const body = {
            targetAccount: recipientId,
            quoteUuid: quoteId,
            customerTransactionId: uuid.v4(), // generates unique ID
            details: {
                reference: "Test Transfer"
            }
        };

        const response = await axios.post(url, body, config);
        return response.data;
    } catch (error) {
        console.error(`Status ${error.response?.status}`);
        console.error(`Trace ID: ${error.response?.headers["x-trace-id"]}`);
        console.error(error.response?.data || error.message);
        throw error;
    }
};


const runLogic = async () => {
    try {
        // Task 1: Get Personal Profile ID
        const profiles = await listProfiles();
        if (!Array.isArray(profiles) || profiles.length === 0) {
            throw new Error("No profiles returned from API.");
        }

        const personalProfile = profiles.find(p => p.type?.toUpperCase() === "PERSONAL");
        if (!personalProfile) throw new Error("No personal profile found.");
        const profileId = personalProfile.id;
        console.log(`Profile ID: ${profileId}`);

        // Task 2: Create Quote & log Quote ID
        const quote = await createQuote(profileId);
        if (!quote || !quote.id) throw new Error("Failed to create quote.");
        console.log(`Quote ID: ${quote.id}`);

        // Task 3–6: Extract BANK_TRANSFER payin & payout option
        const bankTransferOption = quote.paymentOptions?.find(
            option => option.payOut === "BANK_TRANSFER" && option.payIn === "BANK_TRANSFER"
        );

        if (!bankTransferOption) {
            console.warn("No BANK_TRANSFER option available in quote.");
        } else {
            // Task 3: Amount recipient will receive
            const amountToRecipient = bankTransferOption.targetAmount;
            const currency = bankTransferOption.targetCurrency;
            console.log(`Recipient will receive: ${amountToRecipient?.toFixed(2)} ${currency}`);

            // Task 4: Exchange rate
            const exchangeRate = quote.rate;
            console.log(`Exchange Rate: ${exchangeRate?.toFixed(4)}`);

            // Task 5: Total Fee
            const fee = bankTransferOption.fee?.total;
            if (fee !== undefined && bankTransferOption.sourceCurrency) {
                console.log(`Total Fee: ${fee.toFixed(2)} ${bankTransferOption.sourceCurrency}`);
            } else {
                console.warn("Fee information is missing or incomplete.");
            }

            // Task 6: Estimated Delivery
            console.log(`Estimated Delivery: ${bankTransferOption.formattedEstimatedDelivery || "Unknown"}`);
        }

        // Task 7: Create recipient and log ID
        const recipient = await createRecipient();
        if (!recipient || !recipient.id) throw new Error("Failed to create recipient.");
        console.log(`Recipient ID: ${recipient.id}`);

        // Task 8: Create transfer and log ID
        const transfer = await createTransfer(quote.id, recipient.id);
        if (!transfer || !transfer.id) throw new Error("Failed to create transfer.");
        console.log(`Transfer ID: ${transfer.id}`);

        // Task 9: Log transfer status
        console.log(`Transfer Status: ${transfer.status || "Unknown"}`);

        console.log("All tasks completed successfully.");

    } catch (error) {
        console.error("An error occurred during the transfer process:");
        console.error(error.message || error);
        throw error;
    }
};


Promise.resolve()
    .then(() => runLogic())
    .catch((error) => {
        console.error("An error occurred:");
        console.error(error.message || error);
    });