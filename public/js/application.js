const MAX_CORD = 255;
const HALF_CORD = MAX_CORD / 2;
const QUARTER_CORD = MAX_CORD / 4;

let app = angular.module('wardSeeker', []);
let errorModal = new bootstrap.Modal(document.getElementById('errorModal'))

app.controller('WardSeeker',function ($scope, $http)
{
    $scope.timelineMode = false
    $scope.steamId = "145550466" // Dubu

    $scope.laneJungle = true
    $scope.laneRoam = true
    $scope.laneMid = true
    $scope.laneSafe = true
    $scope.laneOff = true

    $scope.roleCore = true
    $scope.roleSoftSupport = true
    $scope.roleHardSupport = true

    $scope.sideRadiant = true
    $scope.sideDire = true

    $scope.matchCount = 10
    $scope.timestamp = '00:00'
    $scope.currentTime = 0
    $scope.allWards = []

    $scope.onSubmit = () => {
        let lanes = []
        let roles = []
        if ($scope.laneRoam) { lanes.push(0) }
        if ($scope.laneSafe) { lanes.push(1) }
        if ($scope.laneMid) { lanes.push(2) }
        if ($scope.laneOff) { lanes.push(3) }
        if ($scope.laneJungle) { lanes.push(4) }

        if ($scope.roleCore) { roles.push(0) }
        if ($scope.roleSoftSupport) { roles.push(1) }
        if ($scope.roleHardSupport) { roles.push(2) }

        let canvas = document.getElementById("mapCanvas");
        let context = canvas.getContext("2d");
        context.clearRect(0, 0, canvas.width, canvas.height);

        $scope.allWards = []
        getMatchList($scope.steamId, lanes, roles, $scope.matchCount)
            .then((matchList)=> {
                let promiseArray = []
                for (let matchIdKey in matchList) {
                    promiseArray.push(getWardLocation(matchList[matchIdKey], $scope.steamId))
                }
                $scope.matchCount = matchList.length;
                $scope.ObsCount = 0;
                $scope.SentCount = 0;
                $scope.timelineMode = true;
                Promise.all(promiseArray)
                    .then((data)=>{
                        for (let i in data) {
                            if ($scope.sideRadiant === false && data[i].side === 0) {
                                continue
                            }
                            if ($scope.sideDire === false && data[i].side === 1) {
                                continue
                            }
                            for (let k in data[i].wards) {
                                const vals = normalizeCoords(data[i].wards[k].positionX, data[i].wards[k].positionY);
                                vals[0] = Math.round(vals[0] * 3.17)
                                vals[1] = Math.round(vals[1] * 3.17)

                                $scope.allWards.push({
                                    x: vals[0],
                                    y: vals[1],
                                    type: data[i].wards[k].type,
                                    side: data[i].side,
                                    time: data[i].wards[k].time,
                                    death: data[i].wards[k].time + (data[i].wards[k].type === 0 ? 360 : 420)
                                })
                            }
                        }
                        $scope.allWards.sort((a,b)=>{
                            if (a.time === b.time) {
                                return 0
                            }
                            if (a.time > b.time) {
                                return 1
                            }
                            if (a.time < b.time) {
                                return -1
                            }
                        })
                        console.log($scope.allWards)
                        this.showWards(0)
                    })
            })
    }

    function getMatchList(steamId, lanes, roles, count) {
        return new Promise((resolve, reject)=>{
            $http.post('https://api.stratz.com/graphql',{
                query: "query PlayerMatchesSummary($steamId: Long!, $request: PlayerMatchesRequestType!){player(steamAccountId: $steamId){steamAccount {name avatar} matches(request: $request){id}}}",
                variables: {
                    steamId: steamId,
                    request: {
                        laneIds: lanes,
                        skip: 0,
                        take: count,
                        isParsed: true,
                        roleIds: roles
                    }
        }
            }).then((response)=>{
                let matches = []
                for (let matchKey in response.data.data.player.matches) {
                    matches.push(response.data.data.player.matches[matchKey].id)
                }
                $scope.playerName = response.data.data.player.steamAccount.name
                $scope.playerAvatar = 'https://steamcdn-a.akamaihd.net/steamcommunity/public/images/avatars/' + response.data.data.player.steamAccount.avatar
                resolve(matches)
            })
                .catch((error)=>{
                    errorModal.show()
                })
        })
    }

    function getWardLocation(matchId, steamId) {
        return new Promise((resolve, reject)=>{
            $http.post('https://api.stratz.com/graphql',{
                query: "query WardPositions($steamId: Long, $matchId: Long!){match(id: $matchId){players(steamAccountId: $steamId){isRadiant stats {wards {time type positionX positionY}}}}}",
                variables: {
                    steamId: steamId,
                    matchId: matchId
                    }
            }).then((response)=>{
                resolve({
                    wards: response.data.data.match.players[0].stats.wards,
                    side: response.data.data.match.players[0].isRadiant ? 0 : 1
                })
            })
            .catch((error)=>{
                errorModal.show()
            })
        })
    }

    this.showWards = (time) => {
        if (time === -1) {
            time = $scope.currentTime
            let minute = Math.floor(time/60)
            let second = time - minute * 60
            $scope.timestamp = ('' +  minute).padStart(2, '0') + ':' + ('' + second).padStart(2, '0')
        }
        const c = document.getElementById("mapCanvas");
        const ctx = c.getContext("2d");
        ctx.clearRect(0, 0, c.width, c.height);
        $scope.ObsCount = 0;
        $scope.SentCount = 0;
        const result = $scope.allWards.filter(ward => ward.time <= time && ward.death >= time);
        result.forEach((ward, index)=>{
            if (ward.side === 0) {
                ctx.fillStyle = "#00FF00";
            } else {
                ctx.fillStyle = "#FF0000";
            }

            if (ward.type === 0){
                ctx.strokeStyle = "#000000";
                ctx.lineWidth   = 5;
                ctx.strokeRect(ward.x,ward.y,5,5);
                $scope.ObsCount += 1;
            }
            else
            {
                $scope.SentCount += 1;
            }
            ctx.fillRect(ward.x,ward.y,5,5); // fill in the pixel at (10,10)
            if (index === result.length)
            {
                $scope.$digest();
                console.log('digest')
            }

        })
    }



    const normalizeCoords = (x, y) => [
        ((x - QUARTER_CORD) * MAX_CORD) / HALF_CORD,
        ((HALF_CORD - (y - QUARTER_CORD)) * MAX_CORD) / HALF_CORD,
    ];
});
