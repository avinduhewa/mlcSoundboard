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

import { Container, Header, Title, Content, Footer, Badge, InputGroup, List, ListItem, Input, FooterTab, Button, Icon, Spinner } from 'native-base';
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
            searchQuery: '',
            errorMessage: ''
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
                    {
                        this.state.errorMessage ?
                        <View style={{padding: 10, flexDirection: 'row', alignItems: 'flex-end', flex: 1}}>
                            <Badge danger>
                                {this.state.errorMessage}
                            </Badge>
                        </View> : null
                    }
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
    soundAction = (file) => {
        if (file.isPlaying) {
            this.stopSound(file)
        } else {
            this.playSound(file)
        }
    }
    renderFile = (file, index) => {
        // <ListItem itemDivider>
        //     <Text>A</Text>
        // </ListItem>
        return (
            <ListItem key={index}>
                <TouchableOpacity
                    style={styles.row}
                    onPress={() => this.soundAction(file)}>
                    <View>
                        <Text style={{fontSize: 16, fontWeight: '600', marginBottom: 3}}>{file.Name}</Text>
                        <Text style={{fontSize: 14, fontWeight: '300'}}>by {file.Tags[0]}</Text>
                    </View>
                    <Icon name={file.isPlaying ? 'ios-pause' : 'ios-play'} style={{color: '#24BBFF'}}/>
                </TouchableOpacity>
            </ListItem>
        )
    }
    sync = () => {
        let context = this
        this.fetchJson().then((res) => {
            if (res) {
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

                const boostedSoundMap = res.map((el, i) => {
                    return {
                        ...el,
                        isPlaying: false,
                        sound: new Sound(el.Path, SOUNDS_LOCAL_PATH, (e) => {})
                    }
                });
                context.setState({
                    files: boostedSoundMap,
                    filteredFiles: boostedSoundMap
                })
            } else {
                this.setState({
                    errorMessage: "Errore connessione server remoto"
                })
            }
        })
    }
    fetchJson() {
        return fetch(MAIN_URL + JSON_NAME)
            .then((response) => response.json())
            .then((responseJson) => {
                return responseJson;
            })
            .catch((error) => {
                console.error(error);
            });
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
                const boostedSoundMap = soundMap.map((el, i) => {
                    return {
                        ...el,
                        isPlaying: false,
                        sound: new Sound(el.Path, SOUNDS_LOCAL_PATH, (e) => {})
                    }
                });

                this.setState({
                    files: boostedSoundMap,
                    filteredFiles: boostedSoundMap
                })
            }
            this.sync()
        })
    }
    stopSound = (file) => {
        let files = this.state.files
        let index = files.findIndex( (el) => el.Path === file.Path)
        if (index >= 0) {
            files[index].isPlaying = !files[index].isPlaying

            this.setState({
                files: files
            })
        }

        file.sound.stop()
    }
    playSound  = (file) => {
        let files = this.state.files
        let index = files.findIndex( (el) => el.Path === file.Path)
        if (index >= 0) {
            files[index].isPlaying = !files[index].isPlaying

            this.setState({
                files: files
            })
        }

        file.sound.play(() => {
            files[index].isPlaying = !files[index].isPlaying

            this.setState({
                files: files
            })
        })
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
