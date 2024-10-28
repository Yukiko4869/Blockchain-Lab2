import React, { useEffect, useState } from 'react';
import { Button, message, Modal, Input, List, Typography } from 'antd';
import { BuyMyRoomContract, ERC20Contract, web3 } from '../../utils/contracts';
import Addresses from '../../utils/contract-addresses.json'
import { UserOutlined } from "@ant-design/icons";

interface HouseInfo {
    ID: number;
    owner: string;
    listedTimestamp: number;
    isForSale: boolean;
    price: number;
}

const HomePage: React.FC = () => {
    const [account, setAccount] = useState<string>('');
    const [isConnecting, setIsConnecting] = useState<boolean>(false);
    const [listHouseId, setListHouseId] = useState<string>('');
    const [listHousePrice, setListHousePrice] = useState<string>('');
    const [isListing, setIsListing] = useState<boolean>(false);
    const [forSaleHouses, setForSaleHouses] = useState<HouseInfo[]>([]);
    const [isFetchingForSale, setIsFetchingForSale] = useState<boolean>(false);
    const [selectedHouseId, setSelectedHouseId] = useState<number | null>(null);
    const [selectedHousePrice, setSelectedHousePrice] = useState<number | null>(null);
    const [isConfirmModalVisible, setIsConfirmModalVisible] = useState<boolean>(false);
    const [isAirdropping, setIsAirdropping] = useState<boolean>(false);
    const [userHouses, setUserHouses] = useState<HouseInfo[]>([]);
    const [isFetchingHouses, setIsFetchingHouses] = useState<boolean>(false);
    const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
    const [exchangeAmount, setExchangeAmount] = useState<string>('');
    const [isExchanging, setIsExchanging] = useState<boolean>(false);
    const [erc20Balance, setErc20Balance] = useState<number>(0);
    const [houseInfo, setHouseInfo] = useState<any>(null);
    const [isHouseInfoModalVisible, setIsHouseInfoModalVisible] = useState<boolean>(false);

    useEffect(() => {
        const initCheckAccounts = async () => {
            const { ethereum } = window as any;
            if (ethereum && ethereum.isMetaMask) {
                const accounts = await ethereum.request({ method: 'eth_accounts' });
                if (accounts && accounts.length > 0) {
                    setAccount(accounts[0]);
                }
            }
        };
        initCheckAccounts();
    }, []);

    const connectWallet = async () => {
        try {
            setIsConnecting(true);
            const { ethereum } = window as any;
            if (!ethereum || !ethereum.isMetaMask) {
                message.error('请安装 MetaMask 钱包');
                return;
            }
            const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
            if (accounts && accounts.length > 0) {
                setAccount(accounts[0]);
                message.success(`已连接账户: ${accounts[0]}`);
                checkUserHouses(); 
                checkTokenBalance(); 
            } else {
                message.error('连接钱包失败');
            }
        } catch (error: any) {
            message.error(`连接钱包失败: ${error.message}`);
        } finally {
            setIsConnecting(false);
        }
    };

    const listHouse = async () => {
        if (!account) {
            message.error('请先连接钱包');
            return;
        }
        if (!listHouseId || isNaN(Number(listHouseId)) || !listHousePrice || isNaN(Number(listHousePrice))) {
            message.error('请输入有效的房子ID和价格');
            return;
        }
        setIsListing(true);
        try {
            await BuyMyRoomContract.methods.listHouse(Number(listHouseId), web3.utils.toWei(listHousePrice, 'ether')).send({ from: account });
            message.success('成功挂出房子');
            setListHouseId('');
            setListHousePrice('');
            getHousesForSale(); 
        } catch (error: any) {
            message.error(`挂出房子失败: ${error.message}`);
        } finally {
            setIsListing(false);
        }
    };

    const getHousesForSale = async () => {
        if (!account) {
            message.error('请先连接钱包');
            return;
        }
        setIsFetchingForSale(true);
        try {
            const houses: HouseInfo[] = await BuyMyRoomContract.methods.getSaleHouse().call();
            if (Array.isArray(houses)) {
                const parsedHouses: HouseInfo[] = houses.map((house) => ({
                    ID: Number(house.ID),
                    owner: house.owner,
                    listedTimestamp: Number(house.listedTimestamp),
                    isForSale: Boolean(house.isForSale),
                    price: Number(web3.utils.fromWei(house.price, 'ether')),
                }));
                setForSaleHouses(parsedHouses);
            } else {
                message.error('未能正确获取房子数据');
            }
        } catch (error: any) {
            message.error(`查询挂出房子失败: ${error.message}`);
        } finally {
            setIsFetchingForSale(false);
        }
    };

    const confirmPurchase = (houseId: number, housePrice: number) => {
        setSelectedHouseId(houseId);
        setSelectedHousePrice(housePrice);
        setIsConfirmModalVisible(true);
    };

    const handlePurchase = async () => {
        if (selectedHouseId !== null && account) {
            try {
                await ERC20Contract.methods.approve(Addresses.BuyMyRoom, selectedHousePrice).send({
                    from: account
                })
                await BuyMyRoomContract.methods.buyHouse(selectedHouseId).send({ from: account});
                message.success(`成功购买房子 ${selectedHouseId}`);
                setIsConfirmModalVisible(false);
                getHousesForSale(); 
                checkUserHouses(); 
            } catch (error: unknown) {
                const errorMessage = (error as any).message || (error as Error).message;
                console.log(error);
                message.error(`购买房子失败: ${errorMessage}`);
            }
        } else {
            message.error('请确保选择了房子并且已连接账户');
        }
    };

    const airdropHouses = async () => {
        if (!account) {
            message.error('请先连接钱包');
            return;
        }
        setIsAirdropping(true);
        try {
            await BuyMyRoomContract.methods.getfreeHouses().send({ from: account });
            message.success('成功领取3个测试房产');
            checkUserHouses(); 
        } catch (error: any) {
            message.error(`领取失败: ${error.message}`);
        } finally {
            setIsAirdropping(false);
        }
    };

    const checkUserHouses = async () => {
        if (!account) {
            message.error('请先连接钱包');
            return;
        }
        setIsFetchingHouses(true);
        try {
            const houses: HouseInfo[] = await BuyMyRoomContract.methods.getOwnInfo(account).call();
            if (Array.isArray(houses)) {
                const parsedHouses: HouseInfo[] = houses.map((house) => ({
                    ID: Number(house.ID),
                    owner: house.owner,
                    listedTimestamp: Number(house.listedTimestamp),
                    isForSale: Boolean(house.isForSale),
                    price: Number(web3.utils.fromWei(house.price, 'ether')),
                }));
                setUserHouses(parsedHouses);
            } else {
                message.error('未能正确获取房子数据');
            }
        } catch (error: any) {
            message.error(`获取房子失败: ${error.message}`);
        } finally {
            setIsFetchingHouses(false);
        }
    };

    const openExchangeModal = () => {
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setExchangeAmount(e.target.value);
    };

    const handleExchange = async () => {
        if (!account) {
            message.error('请先连接钱包');
            return;
        }
        if (!exchangeAmount || isNaN(Number(exchangeAmount)) || Number(exchangeAmount) <= 0) {
            message.error('请输入有效的金额');
            return;
        }
        setIsExchanging(true);
        try {
            await BuyMyRoomContract.methods.buyTokens().send({
                from: account,
                value: web3.utils.toWei(exchangeAmount, 'ether'),
            });
            message.success('兑换成功');
            setIsModalVisible(false);
            checkTokenBalance(); // 更新用户的代币余额
        } catch (error: any) {
            message.error(`兑换失败: ${error.message}`);
        } finally {
            setIsExchanging(false);
        }
    };

    const checkTokenBalance = async () => {
        if (!account) {
            message.error('请先连接钱包');
            return;
        }
        try {
            const balance = await BuyMyRoomContract.methods.getBalance().call({ from: account });
            const balanceInEther = Number(balance) / 1e18;
            setErc20Balance(balanceInEther);
        } catch (error: any) {
            message.error(`查询代币余额失败: ${error.message}`);
        }
    };

    const getHouseInfo = async (houseId: number) => {
        try {
            const houseDetails: any = await BuyMyRoomContract.methods.getHouseInfo(houseId).call();
            const houseInfoMessage = `
                House ID: ${String(houseDetails.ID)}
                Owner: ${houseDetails.owner}
                Listed Timestamp: ${String(houseDetails.listedTimestamp)}
                Is For Sale: ${houseDetails.isForSale}
                Price: ${String(BigInt(houseDetails.price))} 
            `;
            console.log(houseInfoMessage);

            const parsedHouse: HouseInfo = {
                ID: Number(houseDetails.ID),
                owner: houseDetails.owner,
                listedTimestamp: Number(houseDetails.listedTimestamp),
                isForSale: Boolean(houseDetails.isForSale),
                price: Number(web3.utils.fromWei(String(houseDetails.price), 'ether')) * 10 ** 18,
            };
            setHouseInfo(parsedHouse);
            setIsHouseInfoModalVisible(true);
        } catch (error: any) {
            message.error(`查询房屋信息失败: ${error.message}`);
        }
    };

    return (
        <div style={{ padding: '20px' }}>
            <h1>房屋交易平台</h1>
            <div>
                <Button onClick={connectWallet} loading={isConnecting}>
                    {account ? `已连接: ${account}` : '连接钱包'}
                </Button>
                <Button onClick={airdropHouses} loading={isAirdropping} style={{ marginLeft: '10px' }}>
                    领取测试房产
                </Button>
                <Button onClick={getHousesForSale} loading={isFetchingForSale} style={{ marginLeft: '10px' }}>
                    查看出售房屋
                </Button>
                <Button onClick={checkUserHouses} loading={isFetchingHouses} style={{ marginLeft: '10px' }}>
                    查看我的房屋
                </Button>
                <Button onClick={checkTokenBalance} style={{ marginLeft: '10px' }}>
                    查看代币余额
                </Button>
            </div>

            <div style={{ marginTop: '20px' }}>
                <Typography.Text>我的代币余额: {erc20Balance} TOKEN</Typography.Text>
            </div>

            <div style={{ marginTop: '20px' }}>
                <Input
                    placeholder="房子 ID"
                    value={listHouseId}
                    onChange={(e) => setListHouseId(e.target.value)}
                    style={{ width: '200px', marginRight: '10px' }}
                />
                <Input
                    placeholder="价格（代币）"
                    value={listHousePrice}
                    onChange={(e) => setListHousePrice(e.target.value)}
                    style={{ width: '200px', marginRight: '10px' }}
                />
                <Button onClick={listHouse} loading={isListing}>
                    挂单出售
                </Button>
            </div>
            <div style={{ marginTop: '20px' }}>
                <Button onClick={openExchangeModal}>兑换代币</Button>
            </div>
            <div style={{ marginTop: '20px' }}>
                <List
                    header={<div>出售中的房产</div>}
                    bordered
                    dataSource={forSaleHouses}
                    renderItem={(house) => (
                        <List.Item>
                            <Typography.Text>房子ID: {house.ID}</Typography.Text>
                            <Typography.Text style={{ marginLeft: '10px' }}>价格: {house.price} 代币</Typography.Text>
                            <Button onClick={() => getHouseInfo(house.ID)} style={{ marginLeft: '10px' }}>
                                查看房屋信息
                            </Button>
                            <Button onClick={() => confirmPurchase(house.ID, house.price)} style={{ marginLeft: '10px' }}>
                                购买
                            </Button>
                        </List.Item>
                    )}
                />
            </div>
            <div style={{ marginTop: '20px' }}>
                <List
                    header={<div>我的房产</div>}
                    bordered
                    dataSource={userHouses}
                    renderItem={(house) => (
                        <List.Item>
                            <Typography.Text>房子ID: {house.ID}</Typography.Text>
                            <Typography.Text style={{ marginLeft: '10px' }}>房主: {house.owner}</Typography.Text>
                            <Typography.Text style={{ marginLeft: '10px' }}>价格: {house.price} 代币</Typography.Text>
                            <Typography.Text style={{ marginLeft: '10px' }}>状态: {house.isForSale ? '出售中' : '未出售'}</Typography.Text>
                            <Typography.Text style={{ marginLeft: '10px' }}>获得时间: {house.listedTimestamp}</Typography.Text>
                        </List.Item>
                    )}
                />
            </div>

            {/* 购买确认模态框 */}
            <Modal
                title="确认购买"
                visible={isConfirmModalVisible}
                onOk={handlePurchase}
                onCancel={() => setIsConfirmModalVisible(false)}
            >
                <Typography.Text>您确定要购买房子 {selectedHouseId} 吗？</Typography.Text>
            </Modal>

            <Modal
                title="房屋详细信息"
                visible={isHouseInfoModalVisible}
                onOk={() => setIsHouseInfoModalVisible(false)}
                onCancel={() => setIsHouseInfoModalVisible(false)}
                footer={[
                    <Button key="back" onClick={() => setIsHouseInfoModalVisible(false)}>
                        关闭
                    </Button>,
                ]}
            >
                {houseInfo ? (
                    <div>
                        <Typography.Text>房子ID: {houseInfo.ID}</Typography.Text><br />
                        <Typography.Text>房主: {houseInfo.owner}</Typography.Text><br />
                        <Typography.Text>价格: {web3.utils.fromWei(houseInfo.price, 'ether')} 代币</Typography.Text><br />
                        <Typography.Text>状态: {houseInfo.isForSale ? '出售中' : '未出售'}</Typography.Text><br />
                        <Typography.Text>获得时间: {new Date(houseInfo.listedTimestamp * 1000).toLocaleString()}</Typography.Text>
                    </div>
                ) : (
                    <p>未能获取房屋信息</p>
                )}
            </Modal>

            {/* 兑换代币模态框 */}
            <Modal
                title="兑换代币"
                visible={isModalVisible}
                onOk={handleExchange}
                onCancel={handleCancel}
            >
                <Input
                    placeholder="输入兑换金额 (ETH)"
                    value={exchangeAmount}
                    onChange={handleInputChange}
                />
            </Modal>

        </div>
    );
};

export default HomePage;
