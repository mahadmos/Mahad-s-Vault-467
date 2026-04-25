// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract Vault {
    IERC20 public immutable token;
    address public admin;
    uint256 public totalSupply;
    uint256 public feepct = 2;
    mapping(address => uint256) public balanceOf;
    uint256 private nextTokenId;
    mapping(address => uint256) public memberBalance;
    mapping(address => uint256) public memberToken;
    mapping(uint256 => address) public ownerMember;


    constructor(address _token) {
        token = IERC20(_token);
        admin = msg.sender;
    }


    function _mint(address _to, uint256 _shares) private {
        totalSupply += _shares;
        balanceOf[_to] += _shares;
        _mintMembership(_to);
    }


    function _burn(address _from, uint256 _shares) private {
        totalSupply -= _shares;
        balanceOf[_from] -= _shares;
    }


    function _mintMembership(address to) internal {
        if (memberBalance[to] == 0) {
            uint256 tokenId = nextTokenId;
            nextTokenId++;
            ownerMember[tokenId] = to;
            memberBalance[to] = 1;
            memberToken[to] = tokenId;
        }
    }


    function _revokeMembership(address from) internal {
        uint256 tokenId = memberToken[from];
        ownerMember[tokenId] = address(0);
        memberBalance[from] = 0;
        memberToken[from] = 0;
    }


    function deposit(uint256 _amount) external {
        uint256 shares;
        if (totalSupply == 0) {
            shares = _amount;
        } else {
            shares = (_amount * totalSupply) / token.balanceOf(address(this));
        }

        _mint(msg.sender, shares);
        token.transferFrom(msg.sender, address(this), _amount);
    }


    function withdraw(uint256 _shares) external {
        uint256 grossAmount = (_shares * token.balanceOf(address(this))) / totalSupply;
        _burn(msg.sender, _shares);

        // 2% 
        uint256 fee = (grossAmount * feepct) / 100;
        uint256 amount = grossAmount - fee;

        token.transfer(msg.sender, amount);
        token.transfer(admin, fee);

        if (balanceOf[msg.sender] == 0) {
            _revokeMembership(msg.sender);
        }
    }


    function hasMembership(address user) external view returns (bool) {
        return memberBalance[user] == 1;
    }
}


interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    event Transfer(address indexed from, address indexed to, uint256 amount);
    event Approval(address indexed owner, address indexed spender, uint256 amount);
}