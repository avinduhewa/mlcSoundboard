'use strict';

import React, { Component, } from 'react'

import {
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    AsyncStorage,
    ScrollView,
    Dimensions
} from 'react-native';

import { Container, Header, Title, Content, Footer, Badge, InputGroup, List, ListItem, Input, FooterTab, Button, Icon, Spinner } from 'native-base';
import Sound from 'react-native-sound';
import RNFetchBlob from 'react-native-fetch-blob'

const windowSize = Dimensions.get('window');

const MAIN_DIR = RNFetchBlob.fs.dirs.DocumentDir // DocumentDir MainBundleDir DownloadDir
const MAIN_LOCAL_PATH = MAIN_DIR + '/assets'
const SOUNDS_LOCAL_PATH = MAIN_LOCAL_PATH + '/sounds'

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

                    {/* <Button
                        onPress={this.test}>
                        Test
                    </Button> */}
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
    test = () => {
        //get remote file, clean nale and save it in raw
        RNFetchBlob
            .config({
                path : RNFetchBlob.fs.dirs.MainBundleDir + "/asd.wav" // DocumentDir MainBundleDir DownloadDir
            })
            .fetch('GET', MAIN_URL + 'Enciclico/Olifante.wav', {})
            .then((res) => {
                console.log('The file saved to ', res.path())

                RNFetchBlob.fs.stat(RNFetchBlob.fs.dirs.MainBundleDir + '/asd.wav')
               // files will an array contains filenames
               .then((files) => {
                   console.log(files)
               })

                Sound.MAIN_BUNDLE
                var whoosh = new Sound('asd', RNFetchBlob.fs.dirs.MainBundleDir, (error) => {
                  if (error) {
                    console.log('failed to load the sound', error);
                  } else { // loaded successfully
                    console.log('duration in seconds: ' + whoosh.getDuration() +
                        'number of channels: ' + whoosh.getNumberOfChannels());

                        whoosh.play((success) => {
                          if (success) {
                            console.log('successfully finished playing');
                          } else {
                            console.log('playback failed due to audio decoding errors');
                          }
                        });
                  }
                });
            })
            // Status code is not 200
            .catch((errorMessage, statusCode) => {
                // error handling
                console.log(errorMessage)
            })

        //play sound
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
                        //sound: new Sound(el.Path, SOUNDS_LOCAL_PATH, (e) => {})
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
        let context = this
        context.setState({
            totalFetch : this.state.totalFetch + 1,
            isLoading: true
        })
        RNFetchBlob
            .config({
                path : SOUNDS_LOCAL_PATH + '/' + encodeURI(obj.Path) //target path
            })
            .fetch('GET', MAIN_URL + encodeURI(obj.Path), {})
            .then((res) => {
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
                        //sound: new Sound(el.Path, SOUNDS_LOCAL_PATH, (e) => {})
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

        let sound = new Sound(file.Path, SOUNDS_LOCAL_PATH, (error) => {
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
                  sound.play((success) => {
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
                  (err) => {
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
