import React, { useState } from 'react';
import { Button, Card, Col, Input, Menu, MenuProps, message, Row, Space, Typography, Upload, UploadFile } from "antd";
import { CopyOutlined, UploadOutlined } from "@ant-design/icons";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import { startPeer, stopPeerSession } from "./store/peer/peerActions";
import * as connectionAction from "./store/connection/connectionActions"
import { DataType, PeerConnection } from "./helpers/peer";
import { useAsyncState } from "./helpers/hooks";

const { Title } = Typography;
type MenuItem = Required<MenuProps>['items'][number];

function getItem(
    label: React.ReactNode,
    key: React.Key,
    icon?: React.ReactNode,
    children?: MenuItem[],
    type?: 'group',
): MenuItem {
    return {
        key,
        icon,
        children,
        label,
        type,
    } as MenuItem;
}

export const App: React.FC = () => {

    const peer = useAppSelector((state) => state.peer);
    const connection = useAppSelector((state) => state.connection);
    const dispatch = useAppDispatch();

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

    const [fileList, setFileList] = useAsyncState([] as UploadFile[]);
    const [sendLoading, setSendLoading] = useAsyncState(false);
    const [uploadProgress, setUploadProgress] = useState(0); // State to track upload progress

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
            const file = fileList[0] as File;
            const formData = new FormData();
            formData.append('file', file);

            const xhr = new XMLHttpRequest();
            xhr.open('POST', `/api/send?to=${connection.selectedId}`, true);

            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable) {
                    const progress = Math.round((event.loaded * 100) / event.total);
                    setUploadProgress(progress); // Update the progress state
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status === 200) {
                    setSendLoading(false);
                    setUploadProgress(100);
                    message.info("File sent successfully");
                } else {
                    setSendLoading(false);
                    message.error("Error sending file: " + xhr.statusText); // Improved error message
                }
            });

            xhr.addEventListener('error', () => {
                setSendLoading(false);
                message.error("Error sending file: " + xhr.statusText); // Improved error message
            });

            xhr.send(formData);
        } catch (err) {
            setSendLoading(false);
            console.error(err);
            message.error("Error sending file: "); // Improved error message
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
                                await navigator.clipboard.writeText(peer.id || "");
                                message.info("Copied: " + peer.id);
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
                                            items={connection.list.map(e => getItem(e, e, null))} />
                                    </div>
                            }

                        </Card>
                        <Card title="Send File">
                            <Upload fileList={fileList}
                                maxCount={1}
                                onRemove={() => setFileList([])}
                                beforeUpload={(file) => {
                                    setFileList([file])
                                    return false
                                }}>
                                <Button icon={<UploadOutlined />}>Select File</Button>
                            </Upload>
                            <Button
                                type="primary"
                                onClick={handleUpload}
                                disabled={fileList.length === 0}
                                loading={sendLoading}
                                style={{ marginTop: 16 }}
                            >
                                {sendLoading ? 'Sending' : 'Send'}
                            </Button>
                            {/* Display upload progress */}
                            {uploadProgress > 0 && <div>Upload Progress: {uploadProgress}%</div>}
                        </Card>
                    </div>
                </Card>
            </Col>
        </Row>
    );
}

export default App;
