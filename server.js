const ytdl = require('ytdl-core');
const discord = require('discord.js');
const client = new discord.Client();
const search = require('yt-search');
const prefix = '.';
const queue = new Map();

client.on('ready', () =>{
    var tanggal = new Date();
    console.log("ixFlowres activated\nDate started: " + tanggal);
    client.user.setActivity('with Myself');
});


client.on('message', async message => {
    if(message.author.bot){
        return;
    } else
    if(message.content.startsWith(`${prefix}play`)){
        var konten = message.content.split(' ');
        if(!ytdl.validateURL(konten[1])){
            konten.shift();
            var isiLagu = "```";
            search(konten.join(' '), function(err, r) {
                if (err) throw err
                
                const videos = r.videos;

                if(!videos[0]){
                    message.channel.send("Pencarian Tidak Ditemukan!");
                    return;
                } else {
                    for(var i = 0; i < 10; i++){
                        if(!videos[i]){
                            break;
                        }
                        else {
                            isiLagu += i+1+". "+videos[i].title+"\n";
                        }
                    }

                    message.channel.send(isiLagu+"```").then(()=>{
                        message.channel.awaitMessages(m => m.author.id == message.author.id,
                                                            {max:1,time:10000})
                            .then(collected => {
                                if(collected.first().content >= 1 && collected.first().content <= 10){
                                    collected.first().content = videos[collected.first().content-1].url;
                                    eksekusi(collected.first().content,message);
                                }
                            })
                            .catch((collected) => {
                                message.channel.send("Waktu memilih "+message.author.username+" habis!");
                            })
                    })
                }
            })

        }
    } else
    if(message.content == `${prefix}skip`){
        skip(message);
    } else
    if(message.content.startsWith(`${prefix}hapus`)){
        hapusLagu(message);
    } else
    if(message.content == (`${prefix}stop`)){
        stop(message);
    } else
    if(message.content == (`${prefix}np`)){
        sekarangDiputar(message);
    } else
    if(message.content == (`${prefix}q`)){
        antreanLagu(message);
    } else
    if(message.content.startsWith(`${prefix}vol`)){
      gantiVolume(message);
    }
})

async function eksekusi(alamat,message){
    const guildId = message.guild.id;
    if(!ytdl.validateURL(alamat)){
        message.channel.send("Gagal Menambahkan!");
        return;
    }

    const voiceChannel = message.member.voiceChannel;
    if(!voiceChannel){
        return message.channel.send("Masuk ke kanal terlebih dahulu!");
    }
    const izin = voiceChannel.permissionsFor(message.client.user);
    if(!izin.has('CONNECT')||!izin.has('SPEAK')){
        return message.channel.send("Tidak mendapatkan izin!");
    }

    const infoLagu = await ytdl.getInfo(alamat);
    const lagu = {
        title: infoLagu.title,
        url: infoLagu.video_url
    }

    if(!queue.get(guildId)){
        const paketAntrean = {
            textChannel: message.channel,
            voiceChannel: voiceChannel,
            koneksi: null,
            antrean: [],
            volume: 100,
            playing: true,
            dispatcher: null
        };

        queue.set(guildId,paketAntrean);
        try{
            var connection = await voiceChannel.join();
            paketAntrean.koneksi = connection;
            queue.get(guildId).antrean.push(lagu);
            play(message,queue.get(guildId).antrean[0]);
        } catch (err){
            console.log(err);
            queue.delete(guildId);
            return message.channel.send("Terjadi kesalahan");
        }
    } else {
        queue.get(guildId).antrean.push(lagu);
        return message.channel.send(`${lagu.title} ditambahkan!`);
    }
 }

function play(message, lagu){
    const infoServer = queue.get(message.guild.id);

    if(!lagu){
        infoServer.voiceChannel.leave();
        queue.delete(message.guild.id);
        return;
    }
    message.channel.send("**"+lagu.title+"** diputar!")
    infoServer.dispatcher = infoServer.koneksi.playStream(ytdl(lagu.url,{filter:'audio'}))
                            .on('end', () => {
                                infoServer.antrean.shift();
                                play(message,infoServer.antrean[0]);
                            })
                            .on('error', error => {
                                console.log(error);
                            });
    infoServer.dispatcher.setVolumeLogarithmic(infoServer.volume / 100);
}

function skip(message){
    if(!message.member.voiceChannel) return message.channel.send('Kamu harus bergabung dengan kanal suara sebelum mengganti lagu');
    if(!queue.get(message.guild.id)) return message.channel.send("Masukan lagu untuk dilewati!");
    queue.get(message.guild.id).koneksi.dispatcher.end();
}

function stop(message){
    if(!message.member.voiceChannel) return message.channel.send('Kamu harus bergabung dengan kanal suara sebelum mengganti lagu');
    if(!queue.get(message.guild.id)) return message.channel.send("Masukan lagu untuk dilewati!");
    queue.get(message.guild.id).voiceChannel.leave();
    queue.delete(message.guild.id);
}

function hapusLagu(message){
    var pilihan = message.content.split(' ');
    if(!message.member.voiceChannel) return message.channel.send('Kamu harus bergabung dengan kanal suara sebelum menghapus lagu');
    if(!queue.get(message.guild.id)) return message.channel.send("Masukan lagu untuk dihapus!");
    if(!queue.get(message.guild.id).antrean[pilihan[1]]) return message.channel.send("Tidak ada!");
    var title = queue.get(message.guild.id).antrean[pilihan[1]].title;
    var delet = queue.get(message.guild.id).antrean.splice(pilihan[1],1);
    return message.channel.send(title+" telah dihapus dari antrean!")
}

function sekarangDiputar(message){
    if(!message.member.voiceChannel) return message.channel.send('Kamu harus bergabung dengan kanal suara sebelum melihat lagu');
    if(!queue.get(message.guild.id)) return message.channel.send("Masukan lagu untuk diputar");
    return message.channel.send("Lagu yang diputar sekarang: "+queue.get(message.guild.id).antrean[0].title);
}

function antreanLagu(message){
    if(!message.member.voiceChannel) return message.channel.send('Kamu harus bergabung dengan kanal suara sebelum melihat lagu');
    if(!queue.get(message.guild.id)) return message.channel.send("Masukan lagu untuk diputar");
    var antreanKirim = "Lagu yang diputar sekarang: "+queue.get(message.guild.id).antrean[0].title+"\n";
    for(var i=1;i<queue.get(message.guild.id).antrean.length;i++){
        antreanKirim += i+". "+queue.get(message.guild.id).antrean[i].title+"\n";
    }

    return message.channel.send("```"+antreanKirim+"```");
}

function gantiVolume(message){
    var suara = message.content.split(' ');
    if(isNaN(suara[1])) return message.channel.send("Parameter yang diberikan bukan harus angka");
    if(suara[1] > 100 || suara[1] < 0) return message.channel.send("Parameter harus berada diantara 0-100");
    if(!message.member.voiceChannel) return message.channel.send('Kamu harus bergabung dengan kanal suara sebelum mengganti volume');
    if(!queue.get(message.guild.id)) return message.channel.send("Masukan lagu untuk diganti volumenya");
    queue.get(message.guild.id).volume = suara[1];
    queue.get(message.guild.id).dispatcher.setVolumeLogarithmic(queue.get(message.guild.id).volume / 100);
}

client.login(process.env.SECRET);