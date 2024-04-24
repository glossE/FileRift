import React, { useState } from 'react';
import { Button, Card, Col, Input, Menu, message, Progress, Row, Space, Typography, Upload, UploadFile } from "antd";
import { CopyOutlined, UploadOutlined } from "@ant-design/icons";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import { startPeer, stopPeerSession } from "./store/peer/peerActions";
import * as connectionAction from "./store/connection/connectionActions"
import { DataType, PeerConnection } from "./helpers/peer";
import { useAsyncState } from "./helpers/hooks";

const { Title } = Typography;
type ProgressCallback = (progress: number) => void;

export const App: React.FC = () => {
    const peer = useAppSelector((state) => state.peer);
    const connection = useAppSelector((state) => state.connection);
    const dispatch = useAppDispatch();
    const [fileList, setFileList] = useAsyncState([]);
    const [sendLoading, setSendLoading] = useState<boolean>(false);
    const [sendProgress, setSendProgress] = useState<number>(0);

    const handleStartSession = () => {
        dispatch(startPeer());
    }

    const handleStopSession = async () => {
        await PeerConnection.closePeerSession();
        dispatch(stopPeerSession());
    }

    const handleConnectOtherPeer = () => {
        connection.id != null ? dispatch(connectionAction.connectPeer(connection.id || "")) : message.warning("Please enter ID");
    }

    const handleUpload = async () => {
        if (fileList.length === 0) {
            message.warning("Please select file");
            return;
        }
        if (!connection.selectedId) {
            message.warning("Please select a connection");
            return;
        }
        try {
            setSendLoading(true);
            // Get the original File object from UploadFile
            let file = fileList[0].originFileObj as File;
            let blob = new Blob([file], {type: file.type});

            // Simulate progress update
            const interval = setInterval(() => {
                setSendProgress((prevProgress) => {
                    const nextProgress = prevProgress + 10; // Increment progress by 10%
                    return nextProgress > 100 ? 100 : nextProgress; // Ensure progress doesn't exceed 100%
                });
            }, 500); // Simulate progress update every 500ms

            // Perform actual file transfer logic
            await PeerConnection.sendConnection(connection.selectedId, {
                dataType: DataType.FILE,
                file: blob,
                fileName: file.name,
                fileType: file.type
            });

            // Clear interval and update loading state
            clearInterval(interval);
            setSendProgress(100); // Set progress to 100% once file transfer is complete
            setSendLoading(false); // Set loading state to false
            message.info("Send file successfully");
        } catch (err) {
            setSendLoading(false); // Set loading state to false in case of error
            console.log(err);
            message.error("Error when sending file");
        }
    };

    return (
        <Row justify={"center"} align={"top"}>
            <Col xs={24} sm={24} md={20} lg={16} xl={12}>
                <Card>
                    <Title level={2} style={{ textAlign: "center" }}>P2P File Transfer</Title>
                    <Card hidden={peer.started}>
                        <Button onClick={handleStartSession} loading={peer.loading}>Start</Button>
                    </Card>
                    <Card hidden={!peer.started}>
                        <Space direction="horizontal">
                            <div>ID: {peer.id}</div>
                            <Button icon={<CopyOutlined />} onClick={async () => {
                                await navigator.clipboard.writeText(peer.id || "")
                                message.info("Copied: " + peer.id)
                            }} />
                            <Button danger onClick={handleStopSession}>Stop</Button>
                        </Space>
                    </Card>
                    <div hidden={!peer.started}>
                        <Card>
                            <Space direction="horizontal">
                                <Input placeholder={"ID"}
                                    onChange={e => dispatch(connectionAction.changeConnectionInput(e.target.value))}
                                    required={true}
                                />
                                <Button onClick={handleConnectOtherPeer}
                                    loading={connection.loading}>Connect</Button>
                            </Space>
                        </Card>
    
                        <Card title="Connection">
                            {
                                connection.list.length === 0
                                    ? <div>Waiting for connection ...</div>
                                    : <div>
                                        Select a connection
                                        <Menu selectedKeys={connection.selectedId ? [connection.selectedId] : []}
                                            onSelect={(item) => dispatch(connectionAction.selectItem(item.key))}
                                        >
                                            {connection.list.map((item) => (
                                                <Menu.Item key={item}>{item}</Menu.Item>
                                            ))}
                                        </Menu>
                                    </div>
                            }
    
                        </Card>
                        <Card title="Send File">
                            <Upload fileList={fileList}
                                maxCount={1}
                                onRemove={() => setFileList([])}
                                beforeUpload={(file) => {
                                    setFileList([file]);
                                    return false;
                                }}>
                                <Button icon={<UploadOutlined />}>Select File</Button>
                            </Upload>
                            <Progress percent={sendProgress} status={sendLoading ? 'active' : undefined} />
                            <Button
                                type="primary"
                                onClick={handleUpload}
                                disabled={fileList.length === 0}
                                loading={sendLoading}
                                style={{ marginTop: 16 }}
                            >
                                {sendLoading ? 'Sending' : 'Send'}
                            </Button>
                        </Card>
                        
                    </div>
                </Card>
            </Col>
        </Row>
    )
}

export default App;
