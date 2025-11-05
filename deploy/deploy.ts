import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedHarvestVault = await deploy("HarvestVault", {
    from: deployer,
    log: true,
    skipIfAlreadyDeployed: false,
    // Disable auto verification for local networks to avoid network requests
    verify: false,
  });

  console.log(`HarvestVault contract deployed at: ${deployedHarvestVault.address}`);
};
export default func;
func.id = "deploy_harvestVault"; // id required to prevent reexecution
func.tags = ["HarvestVault"];
