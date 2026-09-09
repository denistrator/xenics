use serde::{Deserialize, Serialize};

macro_rules! opaque_id {
    ($name:ident) => {
        #[derive(Clone, Debug, Deserialize, Eq, Hash, PartialEq, Serialize)]
        pub struct $name(pub String);

        impl From<&str> for $name {
            fn from(value: &str) -> Self {
                Self(value.to_owned())
            }
        }
    };
}

opaque_id!(SourceId);
opaque_id!(TechnologyId);
opaque_id!(TaskId);
opaque_id!(DocumentId);
