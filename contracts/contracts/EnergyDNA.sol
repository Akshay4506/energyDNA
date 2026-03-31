// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract EnergyDNA is ERC721URIStorage, Ownable {
    // Token Lifecycle States: 0 = Generated, 1 = Minted, 2 = Transferred, 3 = Retired
    enum LifecycleState { Generated, Minted, Transferred, Retired }

    struct EnergyMetadata {
        string turbineId;
        uint256 timestamp;
        string windSpeed;
        string windDirection;
        string energyOutput;
        string energyDnaHash;
        LifecycleState state;
    }

    mapping(uint256 => EnergyMetadata) public tokenMetadata;

    event EnergyTokenMinted(uint256 indexed tokenId, string energyDnaHash, address owner);
    event EnergyTokenTransferred(uint256 indexed tokenId, address from, address to);
    event EnergyTokenRetired(uint256 indexed tokenId, address owner);

    constructor() ERC721("EnergyDNA", "EDNA") {}

    function mintEnergyToken(
        address to,
        uint256 tokenId,
        string memory turbineId,
        uint256 timestamp,
        string memory windSpeed,
        string memory windDirection,
        string memory energyOutput,
        string memory energyDnaHash,
        string memory tokenURI
    ) public onlyOwner returns (uint256) {
        _mint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);

        tokenMetadata[tokenId] = EnergyMetadata({
            turbineId: turbineId,
            timestamp: timestamp,
            windSpeed: windSpeed,
            windDirection: windDirection,
            energyOutput: energyOutput,
            energyDnaHash: energyDnaHash,
            state: LifecycleState.Minted
        });

        emit EnergyTokenMinted(tokenId, energyDnaHash, to);
        return tokenId;
    }

    function transferEnergyToken(address from, address to, uint256 tokenId) public {
        require(ownerOf(tokenId) == msg.sender || msg.sender == owner() || getApproved(tokenId) == msg.sender || isApprovedForAll(ownerOf(tokenId), msg.sender), "Not authorized to transfer");
        require(tokenMetadata[tokenId].state != LifecycleState.Retired, "Token is retired and cannot be transferred");
        
        _transfer(from, to, tokenId);
        tokenMetadata[tokenId].state = LifecycleState.Transferred;

        emit EnergyTokenTransferred(tokenId, from, to);
    }

    function retireEnergyToken(uint256 tokenId) public {
        require(ownerOf(tokenId) == msg.sender || msg.sender == owner(), "Only owner or contract admin can retire the token");
        require(tokenMetadata[tokenId].state != LifecycleState.Retired, "Token is already retired");

        tokenMetadata[tokenId].state = LifecycleState.Retired;
        
        emit EnergyTokenRetired(tokenId, msg.sender);
    }

    function getEnergyMetadata(uint256 tokenId) public view returns (
        string memory turbineId,
        uint256 timestamp,
        string memory windSpeed,
        string memory windDirection,
        string memory energyOutput,
        string memory energyDnaHash,
        LifecycleState state
    ) {
        EnergyMetadata memory meta = tokenMetadata[tokenId];
        return (
            meta.turbineId,
            meta.timestamp,
            meta.windSpeed,
            meta.windDirection,
            meta.energyOutput,
            meta.energyDnaHash,
            meta.state
        );
    }
}
