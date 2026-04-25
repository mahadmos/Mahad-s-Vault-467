class App {
    constructor() {
        this.VaultAddress = "0xDCcF659426a16BDB5EafA83Fc238460E9D87ba91";
        this.TokenAddress = "0x61A75369D97A01243CAB134348B4b7186bC83CF1";

        this.VaultABI = null;
        this.TokenABI = null;
        this.signer = null;
        this.vaultContract = null;
        this.tokenContract = null;
        this.walletConnected = false;
        this.userAddress = null;
    }

    async loadABIs() {
        try {
            const vaultRes = await fetch("./Vault.json");
            const vaultData = await vaultRes.json();
            this.VaultABI = vaultData.abi;

            const tokenRes = await fetch("./Token.json");
            const tokenData = await tokenRes.json();
            this.TokenABI = tokenData.abi;

            console.log("ABIs loaded");
        } catch (err) {
            console.error("can't load ABIs:", err);
        }
    }

    async connectMetaMaskAndContract() {
        try {
            if (!window.ethereum) {
                alert("MetaMask not found");
                return;
            }

            if (!this.VaultABI || !this.TokenABI) {
                await this.loadABIs();
            }

            const provider = new ethers.providers.Web3Provider(window.ethereum);
            await provider.send("eth_requestAccounts", []);
            this.signer = provider.getSigner();

            this.vaultContract = new ethers.Contract(this.VaultAddress, this.VaultABI, this.signer);
            this.tokenContract = new ethers.Contract(this.TokenAddress, this.TokenABI, this.signer);

            this.walletConnected = true;
            this.userAddress = await this.signer.getAddress();

            document.getElementById("overlay").style.display = "none";
            document.getElementById("user-address").textContent = this.userAddress;

            console.log("connected:", this.userAddress);

            await this.refreshBalances();

        } catch (err) {
            console.error("connection failed:", err);
        }
    }

    async refreshBalances() {
        try {
            const tokenBal = await this.tokenContract.balanceOf(this.userAddress);
            document.getElementById("token-balance").textContent = parseFloat(ethers.utils.formatUnits(tokenBal, 18)).toLocaleString("en-US", {maximumFractionDigits: 2});

            const vaultBal = await this.vaultContract.balanceOf(this.userAddress);
            document.getElementById("vault-balance").textContent = parseFloat(ethers.utils.formatUnits(vaultBal, 18)).toLocaleString("en-US", {maximumFractionDigits: 2});

            const isMember = await this.vaultContract.hasMembership(this.userAddress);
            const memberSpan = document.getElementById("membership-status");
            memberSpan.textContent = isMember ? "Active Member" : "Not a Member";

            const adminAddr = await this.vaultContract.admin();
            document.getElementById("admin-address").textContent = adminAddr;

            const adminBal = await this.tokenContract.balanceOf(adminAddr);
            document.getElementById("admin-balance").textContent = parseFloat(ethers.utils.formatUnits(adminBal, 18)).toLocaleString("en-US", {maximumFractionDigits: 2});

        } catch (err) {
            console.error("error loading balances:", err);
        }
    }

    async deposit() {
        try {
            if (!this.walletConnected) {
                toastr.error("connect wallet");
                return;
            }

            const amt = document.getElementById("deposit-amount").value.trim();

            if (!amt || isNaN(amt) || Number(amt) <= 0) {
                toastr.error("enter a valid amount");
                return;
            }

            const amtWei = ethers.utils.parseUnits(amt, 18);

            toastr.info("approving transfer...");
            const approveTx = await this.tokenContract.approve(this.VaultAddress, amtWei);
            await approveTx.wait();

            toastr.info("depositing...");
            const depositTx = await this.vaultContract.deposit(amtWei);
            await depositTx.wait();

            toastr.success("deposited " + amt + " MMOS!");
            document.getElementById("deposit-amount").value = "";
            await this.refreshBalances();

        } catch (err) {
            console.error("deposit error:", err);
            toastr.error("deposit failed: " + err.message);
        }
    }

    async withdraw() {
        try {
            if (!this.walletConnected) {
                toastr.error("connect wallet");
                return;
            }

            const shares = document.getElementById("withdraw-amount").value.trim();

            if (!shares || isNaN(shares) || Number(shares) <= 0) {
                toastr.error("enter a valid number of shares");
                return;
            }

            const sharesWei = ethers.utils.parseUnits(shares, 18);

            toastr.info("withdrawing...");
            const tx = await this.vaultContract.withdraw(sharesWei);
            await tx.wait();

            toastr.success("withdrew " + shares + " shares (2% fee taken)");
            document.getElementById("withdraw-amount").value = "";
            await this.refreshBalances();

        } catch (err) {
            console.error("withdraw error:", err);
            toastr.error("withdrawal failed: " + err.message);
        }
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    const myApp = new App();
    await myApp.connectMetaMaskAndContract();

    document.getElementById("deposit-btn").addEventListener("click", () => {
        myApp.deposit();
    });

    document.getElementById("withdraw-btn").addEventListener("click", () => {
        myApp.withdraw();
    });
});
