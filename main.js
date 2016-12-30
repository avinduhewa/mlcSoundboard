'use strict';

import React, { Component, } from 'react'

import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    AsyncStorage,
    ScrollView,
    Dimensions,
    Platform,
    NetInfo
} from 'react-native';

import { Container, Header, Title, Content, Footer, Badge, InputGroup, List, ListItem, Input, FooterTab, Button, Icon, Spinner } from 'native-base';
import Sound from 'react-native-sound';
import RNFetchBlob from 'react-native-fetch-blob'
import R from 'ramda';
const windowSize = Dimensions.get('window');

const MAIN_DIR = RNFetchBlob.fs.dirs.DocumentDir
const MAIN_URL = 'https://mountainlaircamp.blob.core.windows.net/mlc-soundbank/'
const JSON_NAME = 'MLCSoundBank.json'

class MainView extends Component {
    constructor(props) {
        super(props)
        this.state = {
            files: [],
            filteredFiles: [],
            isLoading: false,
            currentFetch: 0,
            totalFetch: 0,
            searchQuery: '',
            errorMessage: ''
        }
    }
    componentWillMount() {
        this.getSoundMap()
    }
    isOnlineAction = (action) => {
        NetInfo.isConnected.fetch().then(() => {
            NetInfo.isConnected.addEventListener('change', isConnected => {
                if (isConnected) {
                    action()
                }
            });
        });
    }
    renderFile = (file, index) => {
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
    renderFiles = () => {
        const sorted = R.sortBy(R.prop('SortOrder'));
        const mapIndexed = R.addIndex(R.map);
        const renderer = (file, i) => this.renderFile(file, i);
        return mapIndexed(renderer, sorted(this.state.files));
    }
    render() {
        return (
            <Container>
                {/* <Header searchBar rounded>
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
                </Header> */}
                <Header>
                    <Button transparent>
                        <View/>
                    </Button>

                    <Title>MLC Soundboard</Title>

                    <Button transparent
                        onPress={this.sync}>
                        <Icon name='ios-sync' />
                    </Button>
                </Header>

                <Content>
                    {
                        this.state.isLoading ?
                        <Spinner animating ={this.state.isLoading}  color='black' size='small' /> :
                            null
                    }
                    {
                        this.state.isLoading ?
                        <View style={{padding: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: windowSize.width}}>
                            <Badge info>Aggiornamento {this.state.currentFetch} di {this.state.totalFetch}</Badge>
                        </View> :
                            null
                    }
                    {
                        this.state.errorMessage ?
                        <View style={{padding: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: windowSize.width}}>
                            <Badge danger>
                                {this.state.errorMessage}
                            </Badge>
                        </View> : null
                    }
                    <List>
                      {this.renderFiles()}
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
    sync = () => {
        const context = this
        this.fetchData().then((res) => {
            if (res) {
                const manageDirsResult = Platform.OS == 'ios' ? [] : this.manageDirs(res)

                Promise.all(manageDirsResult).then(values => {
                    console.log("dirs ok")
                    Promise.all(res.map(obj => this.manageSingleFile(obj))).then(values => {
                        console.log("files ok")

                        //update local json
                        AsyncStorage.setItem('soundMap', JSON.stringify(res));

                        const boostedSoundMap = res.map((el, i) => {
                            return {
                                ...el,
                                isPlaying: false,
                                sound: new Sound(el.Path, MAIN_DIR, (e) => {})
                            }
                        });
                        context.setState({
                            files: boostedSoundMap,
                            filteredFiles: boostedSoundMap
                        })
                    })
                });
            } else {
                this.setState({
                    errorMessage: "Errore connessione server remoto"
                })
            }
        })
    }
    manageDirs = files => {
        console.log("checking dirs..")
        const getPath = el => R.split('/')((el.Path).head())
        const uniqueDirs = R.dropRepeats(R.map(getPath, files));
        return uniqueDirs.map(path => {
            const fullPath = `${MAIN_DIR}/${path}`
            return RNFetchBlob.fs.isDir(fullPath)
                .then(isDir => {
                    if (!isDir) {
                        return RNFetchBlob.fs.mkdir(fullPath)
                    }
                })
        })
    }
    checkFileExistence(file) {
        //check esistenza local file
        return RNFetchBlob.fs.exists(`${MAIN_DIR}/${file.Path}`)
    }
    manageSingleFile = (file) => {
        const context = this
        const localObj = R.find(el => el.Path === file.Path, context.state.files)

        return this.checkFileExistence(file).then(exist => {
            if (!exist || !localObj || file.LastModified > localObj.LastModified) {
                return this.fetchRemoteFile(file)
            }
            return null
        })
        .catch(() => {
            console.log("error file exist check", file)
        })
    }
    async fetchData() {
        const response = await fetch(MAIN_URL + JSON_NAME);
        return await response.json();
    }
    fetchRemoteFile = (obj) => {
        const context = this
        context.setState({
            totalFetch : this.state.totalFetch + 1,
            isLoading: true
        })
        return RNFetchBlob
            .config({
                path: `${MAIN_DIR}/${obj.Path}` //local target path
            })
            .fetch('GET', `${MAIN_URL}/${obj.Path}`, {})
            .then(res => {
                console.log('The file saved to ', res.path())

                context.setState({
                    currentFetch : context.state.currentFetch + 1,
                    isLoading: context.state.currentFetch + 1 != context.state.totalFetch
                })
            })
            // Status code is not 200
            .catch((errorMessage, statusCode) => {
                // error handling
                console.log(errorMessage)

                context.setState({
                    currentFetch : context.state.currentFetch + 1,
                    isLoading: context.state.currentFetch + 1 != context.state.totalFetch
                })
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
                        sound: new Sound(el.Path, MAIN_DIR, (e) => {})
                    }
                });

                this.setState({
                    files: boostedSoundMap,
                    filteredFiles: boostedSoundMap
                })
            }
        })
    }
    stopSound = (file) => {
        const files = this.state.files
        const index = R.findIndex(el => el.Path === file.Path, files)
        if (index >= 0) {
            files[index].isPlaying = !files[index].isPlaying

            this.setState({
                files: files
            })
        }

        file.sound.stop()
    }
    playSound  = (file) => {
        const files = this.state.files
        const index = R.findIndex(el => el.Path === file.Path, files)
        if (index >= 0) {
            files[index].isPlaying = !files[index].isPlaying

            this.setState({
                files: files
            })
        }

        const sound = new Sound(file.Path, MAIN_DIR, error => {
            if (error) {
              console.log('failed to load the sound', error);
            } else { // loaded successfully
              console.log('duration in seconds: ' + sound.getDuration() +
                  'number of channels: ' + sound.getNumberOfChannels());
                    files[index].sound = sound
                    this.setState({
                        files: files
                    })

                  //file.sound.enableInSilenceMode(true);
                  console.log("name", sound._filename)
                  sound.play(success => {
                      if (success) {
                          files[index].isPlaying = !files[index].isPlaying


                          this.setState({
                              files: files
                          })
                      } else {
                          this.setState({
                              errorMessage: "Errore riproduzione audio"
                          })
                      }
                  },
                  err => {
                      console.log(err)
                  })
            }
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
