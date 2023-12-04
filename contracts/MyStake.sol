// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "hardhat/console.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyStake is Ownable {

    IERC20 public stakeToken;
    IERC20 public rewardToken;

    uint public totalReward;
    uint public duration;
    uint public lastUpdateTime;
    uint public totalSupply;
    uint public rewardPerToken;

    mapping(address => uint) public deposits;
    mapping(address => uint) public rewards;
    mapping(address => uint) public userRewardPerTokenPaid;

    event Deposit(address _user, uint _amount, uint _depositTime);
    event Withdraw(address _user, uint _amount, uint _withdrawTime);
    event Claim(address _user, uint reward);

    error InvalidAmount();

    constructor(IERC20 _stakeToken, IERC20 _rewardToken, address initialOwner) Ownable(initialOwner) {
        stakeToken = _stakeToken;
        rewardToken = _rewardToken;
    }

    function setTotalReward(uint _totalReward) public onlyOwner {
        totalReward = _totalReward;
    } 

    function setDuration(uint _duration) public onlyOwner {
        duration = _duration;
    }

    function deposit(uint _amount) public {
        if(_amount == 0) {
            revert InvalidAmount();
        }
        stakeToken.transferFrom(msg.sender, address(this), _amount);
        reward(msg.sender);
        deposits[msg.sender] += _amount;
        totalSupply += _amount;
        emit Deposit(msg.sender, _amount, block.timestamp);
    }

    function reward(address _user) private {
        uint currentTime = block.timestamp;
        uint rewardRatePerSecond = totalReward / duration;
        if(totalSupply != 0) {
            rewardPerToken += ((rewardRatePerSecond) * (currentTime - lastUpdateTime)) / totalSupply;
        }
        rewards[_user] += deposits[_user] * (rewardPerToken - userRewardPerTokenPaid[_user]);
        userRewardPerTokenPaid[_user] = rewardPerToken;
        lastUpdateTime = currentTime;
    }

    function withdraw(uint _amount) public payable {
        if(_amount > deposits[msg.sender]) {
            revert InvalidAmount();
        }
        reward(msg.sender);
        stakeToken.transfer(msg.sender, _amount);
        deposits[msg.sender] -= _amount;
        totalSupply -= _amount;
        userRewardPerTokenPaid[msg.sender] = 0;
        emit Withdraw(msg.sender, _amount, block.timestamp);
    }

    function claim() public {
        rewardToken.transfer(msg.sender, rewards[msg.sender]);
        emit Claim(msg.sender, rewards[msg.sender]);
        rewards[msg.sender] = 0;
    }
}
