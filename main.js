'use strict';

import React, { Component, } from 'react'

import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    AsyncStorage,
    ScrollView
} from 'react-native';

import { Container, Header, Title, Content, Footer, InputGroup, List, ListItem, Input, FooterTab, Button, Icon, Spinner } from 'native-base';
import Sound from 'react-native-sound';
import RNFetchBlob from 'react-native-fetch-blob'

const MAIN_LOCAL_PATH = RNFetchBlob.fs.dirs.MainBundleDir + '/assets/'
const SOUNDS_LOCAL_PATH = MAIN_LOCAL_PATH + 'sounds/'

const MAIN_URL = 'https://mountainlaircamp.blob.core.windows.net/mlc-soundbank/'
const JSON_NAME = 'MLCSoundBank.json'

class MainView extends Component {
    constructor(props) {
        super(props)
        this.state = {
            files: [],
            filteredFiles: [],
            isLoading: false,
            searchQuery: ''
        }
    }
    componentWillMount() {
        this.getSoundMap()
    }
    render() {
        return (
            <Container>
                <Header searchBar rounded>
                    <InputGroup>
                        <Icon name="ios-search" />
                        <Input
                            placeholder="Cerca"
                            onChangeText={text => {
                                this.setState({
                                    searchQuery: text
                                })
                            }}  />
                    </InputGroup>
                    <Button transparent onPress={this.filterName}>
                        Cerca
                    </Button>
                </Header>
                {/* <Header>
                    <Button transparent>
                        <View/>
                    </Button>

                    <Title>MLC Soundboard</Title>

                    <Button transparent
                        onPress={this.sync}>
                        <Icon name='ios-sync' />
                    </Button>
                </Header> */}

                <Content>
                    {/* <Spinner animating ={this.state.isLoading}  color='black' size='small' /> */}
                    <List>
                      {this.state.filteredFiles.map((file, i) => this.renderFile(file, i))}
                   </List>
                </Content>

                {/* <Footer>
                    <FooterTab>
                        <Button transparent>
                            <Icon name='ios-call' />
                        </Button>
                    </FooterTab>
                </Footer> */}
            </Container>
        )
    }
    filterName = () => {
        console.log(this.state.files)
        this.setState({
            filteredFiles: this.state.files.filter((el) => {
                return el.Name.indexOf(this.state.searchQuery) >= 0 || el.Tags.find(tag => tag.indexOf(this.state.searchQuery) >= 0)
            })
        })
    }
    renderFile = (file, index) => {
        // <ListItem itemDivider>
        //     <Text>A</Text>
        // </ListItem>
        // <ListItem >
        //     <Text>Aaron Bennet</Text>
        // </ListItem>
        return (
            <ListItem key={index}>
                <TouchableOpacity
                    style={styles.row}
                    onPress={() => this.playSound(encodeURI(file.Path))}>
                    <View>
                        <Text style={{fontSize: 16, fontWeight: '600', marginBottom: 3}}>{file.Name}</Text>
                        <Text style={{fontSize: 14, fontWeight: '300'}}>by {file.Tags[0]}</Text>
                    </View>

                    <Icon name="ios-play"/>
                </TouchableOpacity>
            </ListItem>
        )
    }
    sync = () => {
        let context = this
        this.fetchJson().then((res) => {
            if (res) {
                //console.log("res2", res)

                //fetch remote solo di quelli da aggiornare
                res.map(obj => {
                    //find item in local json
                    let localObj = context.state.files.find(el => el.Path === obj.Path)

                    if (!localObj || obj.LastModified > localObj.LastModified) {
                        this.fetchRemoteFile(obj)
                    }
                })

                //update local json
                AsyncStorage.setItem('soundMap', JSON.stringify(res));
                context.setState({
                    files: res,
                    filteredFiles: res
                })
            }
        })
    }
    fetchJson() {
        return RNFetchBlob
            .config({
                path : MAIN_LOCAL_PATH + JSON_NAME //target path
            })
            .fetch('GET', MAIN_URL + JSON_NAME, {})
            .then((res) => {
                //console.log(res.json())
                return res.json()
            })
            .catch((errorMessage, statusCode) => {
                // error handling
                console.log(errorMessage)
            })
    }
    fetchRemoteFile = (obj) => {
        RNFetchBlob
            .config({
                path : SOUNDS_LOCAL_PATH + encodeURI(obj.Path) //target path
            })
            .fetch('GET', MAIN_URL + encodeURI(obj.Path), {})
            .then((res) => {
                // the conversion is done in native code
                // the following conversions are done in js, it's SYNC
                console.log('The file saved to ', res.path())
            })
            // Status code is not 200
            .catch((errorMessage, statusCode) => {
                // error handling
                console.log(errorMessage)
            })
    }
    getSoundMap = () => {
        AsyncStorage.getItem('soundMap').then((res) => {
            const soundMap = JSON.parse(res)
            if (soundMap) {
                this.setState({
                    files: soundMap,
                    filteredFiles: soundMap
                })
            }
            this.sync()
        })
    }
    getLocalFiles = (path) => {
        RNFetchBlob.fs.ls(SOUNDS_LOCAL_PATH + path)
            // files will an array contains filenames
            .then((files) => {
                this.setState({
                    files: files
                })
            })
    }
    playSound  = (path) => {
        var s = new Sound(path, SOUNDS_LOCAL_PATH, (e) => {
            if (e) {
                console.log('error', e);
            } else {
                console.log('duration', s.getDuration());
                s.play();
            }
        });
    }
}

var styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginRight: 10
    }
});

export default MainView;
