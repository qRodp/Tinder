'use strict';

app.factory('Auth', function($firebaseAuth, $firebaseObject, $firebaseArray, $state, $http, $q) {
	var ref = firebase.database().ref();
	var auth = $firebaseAuth();

	var Auth = {
		
		createProfile: function(uid, profile) {
			return ref.child('profiles').child(uid).set(profile);
		},

		getProfile: function(uid) {
			return $firebaseObject(ref.child('profiles').child(uid));
		},

		login: function() {

			var provider = new firebase.auth.FacebookAuthProvider();
			provider.addScope('public_profile, email, user_location, user_birthday, user_photos, user_about_me');

			return auth.$signInWithPopup(provider)

				.then(function(result) {
					
					var accessToken = result.credential.accessToken;
					var user = Auth.getProfile(result.user.uid).$loaded();

					user.then(function(profile) {
                        if (profile.name == undefined) {
							
							var graph_url = 'https://graph.facebook.com/me?fields=';
							var access = '&access_token=' + accessToken;

							var first_name = $http.get(graph_url + 'first_name' + access);
							var gender = $http.get(graph_url + 'gender' + access);
							var birthday = $http.get(graph_url + 'birthday' + access);
							var location = $http.get(graph_url + 'location' + access);
							var about = $http.get(graph_url + 'about' + access);
							var photos = $http.get('https://graph.facebook.com/me/photos/uploaded?fields=source&access_token=' + accessToken);

							var infos = [first_name, gender, birthday, location, about, photos];

							$q.all(infos).then(function(data){
								var info = result.user.providerData[0];
                            	var profile = {
	                                name: info.displayName,
	                                email: info.email,
	                                avatar: info.photoURL,
	                                first_name: data[0].data.first_name,
	                                gender: data[1].data.gender ? data[1].data.gender : "",
	                                birthday: data[2].data.birthday ? data[2].data.birthday : "",
	                                age: data[2].data.birthday ? Auth.getAge(data[2].data.birthday) : "",
	                                location: data[3].data.location ?  data[3].data.location.name : "Paris, France",
                                    bio: data[4].data.about ? data[4].data.about : "",
                                    images: data[5].data.data
	                            }

	                            Auth.createProfile(result.user.uid, profile);
							});
                       
                        }
                    });
                });
		},

		logout: function() {
			ref.child('profiles').child(auth.$getAuth().uid).update({isOnline: false});
			return auth.$signOut();
		},

		getAge: function(birthday) {
            return new Date().getFullYear() - new Date(birthday).getFullYear();
        },

		requireAuth: function() {
            return auth.$requireSignIn();
        },

        getProfiles: function() {
        	return $firebaseArray(ref.child('profiles'));
        },

        getProfilesByAge: function(age) {
        	return $firebaseArray(ref.child('profiles').orderByChild('age').startAt(18).endAt(age));
        },

        setOnline: function(uid){
		    var connected = $firebaseObject(ref.child(".info/connected"));
		    var online = $firebaseObject(ref.child('profiles').child(uid));

		    connected.$watch(function(){
		        if(connected.$value === true){
		            ref.child('profiles').child(uid).update({
		                isOnline: true
		            });

		            online.$ref().onDisconnect().update({
		                isOnline: false
		            });
		        }
		    });
		}

	};


	auth.$onAuthStateChanged(function(authData){
		if(authData){
			console.log('Logged in!');
		} else {
			$state.go('login');
			console.log('You need to login.');
		}
	});

	return Auth;
});