// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

interface IZRC20 is IERC20 {
    function withdrawGasFee() external view returns (address, uint256);
}

interface IUniswapV2Router02 {
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external returns (uint256[] memory amounts);
}

interface IGatewayZEVM {
    struct RevertOptions {
        address revertAddress;
        bool callOnRevert;
        address abortAddress;
        bytes revertMessage;
        uint256 revertGasLimit;
    }

    function withdraw(
        bytes calldata receiver,
        uint256 amount,
        address zrc20,
        RevertOptions calldata revertOptions
    ) external;
}

contract ZetaBatchExecutor {
    error ZeroAddress();
    error UnsupportedGasToken(address token);
    error InsufficientOutputForGas(uint256 amountOut, uint256 gasFee);

    event BatchSwapAndWithdraw(
        address indexed sender,
        address indexed zrc20In,
        address indexed zrc20Out,
        uint256 amountIn,
        uint256 withdrawAmount,
        bytes receiver
    );

    address public immutable router;
    address public immutable gateway;

    constructor(address router_, address gateway_) {
        if (router_ == address(0) || gateway_ == address(0)) {
            revert ZeroAddress();
        }
        router = router_;
        gateway = gateway_;
    }

    function swapAndWithdraw(
        address zrc20In,
        address zrc20Out,
        uint256 amountIn,
        uint256 amountOutMin,
        bytes calldata receiver,
        uint256 deadline
    ) external returns (uint256 amountOut, uint256 withdrawAmount) {
        IERC20(zrc20In).transferFrom(msg.sender, address(this), amountIn);
        IERC20(zrc20In).approve(router, 0);
        IERC20(zrc20In).approve(router, amountIn);

        address[] memory path = new address[](2);
        path[0] = zrc20In;
        path[1] = zrc20Out;

        uint256[] memory amounts = IUniswapV2Router02(router).swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            address(this),
            deadline
        );
        amountOut = amounts[amounts.length - 1];

        (address gasToken, uint256 gasFee) = IZRC20(zrc20Out).withdrawGasFee();
        if (gasToken != zrc20Out) {
            revert UnsupportedGasToken(gasToken);
        }
        if (amountOut <= gasFee) {
            revert InsufficientOutputForGas(amountOut, gasFee);
        }

        withdrawAmount = amountOut - gasFee;
        IERC20(zrc20Out).approve(gateway, 0);
        IERC20(zrc20Out).approve(gateway, amountOut);

        IGatewayZEVM.RevertOptions memory revertOptions = IGatewayZEVM.RevertOptions({
            revertAddress: msg.sender,
            callOnRevert: false,
            abortAddress: address(0),
            revertMessage: "",
            revertGasLimit: 200000
        });

        IGatewayZEVM(gateway).withdraw(receiver, withdrawAmount, zrc20Out, revertOptions);
        emit BatchSwapAndWithdraw(msg.sender, zrc20In, zrc20Out, amountIn, withdrawAmount, receiver);
    }
}
